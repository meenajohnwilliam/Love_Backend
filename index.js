const express = require("express");
const cors = require("cors")
const authRoutes = require('./src/auth')
const cookieParser = require("cookie-parser");
const natural = require("natural");
const prisma =  require("./src/prisma")


const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://love-backend-1agq.onrender.com"
  ], // frontend URL
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use("/",authRoutes)

// Normalize function to clean strings for comparison
function normalize(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "");
}


app.post("/form", async (req, res) => {
    try {
      const { yourName, yourSpouseName , userId } = req.body;
  
      if (!yourName) {
        return res.status(400).json({ message: "Your Name is required" });
      }
      if (!yourSpouseName) {
        return res.status(400).json({ message: "Your Spouse Name is required" });
      }
  
      const form = await prisma.form.create({
        data: {
          yourName,
          yourSpouseName,
          status: "DRAFT",
          userId:userId
         
        }
      });
  
      res.status(201).json({
        message: "Form created successfully",
        form
      });
    } catch (error) {
        console.log(error)
      res.status(500).json({ message: "Failed to create form" });
    }
  });
  
app.post("/form/:formId/fields", async (req, res) => {
    try {
      const { formId } = req.params;
      const { fields } = req.body;
  
      await Promise.all(
        fields.map(async (field) => {
          const createdField = await prisma.field.create({
            data: {
              label: field.label,
              type: field.type,
              order: field.order,
              formId,
              correctAnswer: field.correctAnswer
                ? JSON.stringify(field.correctAnswer)
                : null
            }
          });
  
          if (field.options && field.options.length > 0) {
            await prisma.option.createMany({
              data: field.options.map(opt => ({
                label: opt,
                fieldId: createdField.fieldId
              }))
            });
          }
        })
      );
  
      const form = await prisma.form.update({
        where: { formId },
        data: { status: "PUBLISHED" }
      });
  
      res.json({
        message: "Fields added and form published successfully",
        publicLink: `http://localhost:3001/form/${formId}`,
        form
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Failed to create fields or publish form"
      });
    }
  });

app.put("/form/:formId/reveal", async (req, res) => {
    try {
      const { formId } = req.params;
      const { revealText, revealImage } = req.body;
  
      // ❌ Validation: at least one is required
      if (!revealText && !revealImage) {
        return res.status(400).json({
          message: "Either revealText or revealImage is required"
        });
      }
  
      const form = await prisma.form.update({
        where: { formId },
        data: {
          revealText: revealText || null,
          revealImage: revealImage || null
        }
      });
  
      res.json({
        message: "Reveal content updated successfully",
        reveal: {
          text: form.revealText,
          image: form.revealImage
        }
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Failed to update reveal content"
      });
    }
  });

  app.get("/form/:formId", async (req, res) => {
    try {
      const { formId } = req.params;
  
      const form = await prisma.form.findUnique({
        where: { formId },
        select: {
          formId: true,
          yourName: true,
          yourSpouseName: true,
          revealText: true,
          revealImage: true,
          fields: {
            orderBy: { order: "asc" },
            select: {
              fieldId: true,
              label: true,
              type: true,
              order: true,
              options: {
                select: {
                  optionId: true,
                  label: true
                }
              }
            }
          }
        }
        
      });
  
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
  
      res.json(form);
    } catch (error) {
      console.error("Get form error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  


  // ================== SUBMIT FORM (SCORING) ==================
  app.post("/form/:formId/submit", async (req, res) => {
    try {
      console.log("🔹 API HIT: /form/:formId/submit");
  
      const { formId } = req.params;
      const { answers } = req.body;
  
      console.log("1️⃣ Form ID:", formId);
      console.log("2️⃣ Answers received:", JSON.stringify(answers, null, 2));
  
      // ================= FETCH FORM =================
      const form = await prisma.form.findUnique({
        where: { formId },
        include: { fields: true }
      });
  
      console.log("3️⃣ Form fetched from DB:", JSON.stringify(form, null, 2));
  
      if (!form) {
        console.log("❌ Form not found");
        return res.status(404).json({ message: "Form not found" });
      }
  
      if (form.status !== "PUBLISHED") {
        console.log("❌ Form status is not PUBLISHED:", form.status);
        return res.status(403).json({ message: "Form not available" });
      }
  
      let totalSimilarity = 0;
      let totalQuestions = 0;
      const valuesData = [];
  
      console.log("4️⃣ Starting answer evaluation loop...");
  
      // ================= PROCESS ANSWERS =================
      for (const ans of answers) {
        console.log("➡ Processing answer:", ans);
  
        const field = form.fields.find(f => f.fieldId === ans.fieldId);
  
        console.log("5️⃣ Matched field:", field);
  
        if (!field) {
          console.log("⚠ Field not found for fieldId:", ans.fieldId);
          continue;
        }
  
        if (!field.correctAnswer) {
          console.log("⚠ No correctAnswer set for field:", field.fieldId);
          continue;
        }
  
        console.log("6️⃣ Raw correctAnswer:", field.correctAnswer);
        console.log("7️⃣ User answer:", ans.value);
  
        const correct = normalize(JSON.parse(field.correctAnswer));
        const user = normalize(ans.value);
  
        console.log("8️⃣ Normalized correct answer:", correct);
        console.log("9️⃣ Normalized user answer:", user);
  
        const similarity = natural.JaroWinklerDistance(user, correct);
  
        console.log("🔟 Similarity score:", similarity);
  
        totalSimilarity += similarity;
        totalQuestions++;
  
        console.log("1️⃣1️⃣ totalSimilarity:", totalSimilarity);
        console.log("1️⃣2️⃣ totalQuestions:", totalQuestions);
  
        valuesData.push({
          fieldId: ans.fieldId,
          value: ans.value
        });
  
        console.log("1️⃣3️⃣ valuesData updated:", valuesData);
      }
  
      // ================= SCORE CALCULATION =================
      const score =
        totalQuestions === 0
          ? 0
          : Math.round((totalSimilarity / totalQuestions) * 100);
  
      console.log("1️⃣4️⃣ Final score calculated:", score);
  
      // ================= SAVE RESPONSE =================
      const response = await prisma.response.create({
        data: {
          formId,
          submissionScore: score,
          values: {
            create: valuesData
          }
        }
      });
  
      console.log("1️⃣5️⃣ Response saved:", response);
  
      // ================= UPDATE FORM COUNT =================
      const updatedForm = await prisma.form.update({
        where: { formId },
        data: {
          responseCount: { increment: 1 }
        }
      });
  
      console.log("1️⃣6️⃣ Form responseCount updated:", updatedForm.responseCount);
  
      // ================= FINAL RESPONSE =================
      res.json({
        responseId: response.responseId,
        score
      });
  
      console.log("✅ API SUCCESS RESPONSE SENT");
  
    } catch (err) {
      console.error("🔥 ERROR OCCURRED:", err);
      res.status(500).json({ message: "Submission failed" });
    }
  });
  

// // ================== USER FORMS ==================
app.get("/user/:userId/forms", async (req, res) => {
  try {
    const { userId } = req.params;

    const forms = await prisma.form.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            userId: true,
            email: true,
            role: true
          }
        },
        fields: {
          orderBy: { order: "asc" },
          include: {
            options: true,   // ✅ MCQ / Choice options
            values: true     // ✅ Submitted values (if used)
          }
        },
        responses: true     // ✅ All submissions
      }
    });

    res.status(200).json({
      success: true,
      totalForms: forms.length,
      forms
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch forms"
    });
  }
});


// // ================== FORM RESPONSES ==================
app.get("/form/:formId/responses", async (req, res) => {
  try {
    const form = await prisma.form.findUnique({
      where: { formId: req.params.formId },
      include: {
        responses: {
          include: {
            values: { include: { field: true } }
          }
        }
      }
    });

    if (!form) return res.status(404).json({ message: "Form not found" });

    const responses = form.responses.map((r, i) => ({
      attempt: i + 1,
      score: r.submissionScore,
      submittedAt: r.createdAt,
      answers: r.values.map(v => ({
        question: v.field.label,
        answer: v.value
      }))
    }));

    res.json({
      totalResponses: form.responseCount,
      responses
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch responses" });
  }
});

  

app.listen(3001, () => {
  console.log("🚀 Server running on http://localhost:3001");
});
