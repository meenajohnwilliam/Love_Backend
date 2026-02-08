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
    const { formId } = req.params;
    const { answers } = req.body;

    const form = await prisma.form.findUnique({
      where: { formId },
      include: { fields: true }
    });

    if (!form || form.status !== "PUBLISHED") {
      return res.status(403).json({ message: "Form not available" });
    }

    let totalSimilarity = 0;
    let totalQuestions = 0;

    const valuesData = [];

    for (const ans of answers) {
      const field = form.fields.find(f => f.fieldId === ans.fieldId);
      if (!field || !field.correctAnswer) continue;

      const correct = normalize(JSON.parse(field.correctAnswer));
      const user = normalize(ans.value);

      const similarity = natural.JaroWinklerDistance(user, correct);

      totalSimilarity += similarity;
      totalQuestions++;

      valuesData.push({
        fieldId: ans.fieldId,
        value: ans.value
      });
    }

    const score =
      totalQuestions === 0
        ? 0
        : Math.round((totalSimilarity / totalQuestions) * 100);

    const response = await prisma.response.create({
      data: {
        formId,
        submissionScore: score,
        values: { create: valuesData }
      }
    });

    await prisma.form.update({
      where: { formId },
      data: { responseCount: { increment: 1 } }
    });

    res.json({
      responseId: response.responseId,
      score
    });
  } catch (err) {
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
