const express = require("express");
const app = express();
const cors = require("cors")
const authRoutes = require('./src/auth')
const cookieParser = require("cookie-parser");
const prisma =  require("./src/prisma")

app.use(cors({
  origin: [
    "http://localhost:5173/",
    "https://love-backend-1agq.onrender.com/"
  ], // frontend URL
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use("/",authRoutes)





app.post("/form", async (req, res) => {
    try {
      const { yourName, yourSpouseName} = req.body;
  
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
        publicLink: `/form/${formId}`,
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
  
  app.post("/form/:formId/submit", async (req, res) => {
    try {
      const { formId } = req.params;
      const { answers } = req.body;
      // answers = [{ fieldId, value }]
  
      // 1️⃣ Check form exists & published
      const form = await prisma.form.findUnique({
        where: { formId },
      });
  
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
  
      if (form.status !== "PUBLISHED") {
        return res.status(403).json({ message: "Form not published" });
      }
  
      // 2️⃣ Create response
      const response = await prisma.response.create({
        data: {
          formId,
        },
      });
  
      // 3️⃣ Save values
      const valuesData = answers.map((ans) => ({
        responseId: response.responseId,
        fieldId: ans.fieldId,
        value: ans.value,
      }));
  
      await prisma.value.createMany({
        data: valuesData,
      });
  
      // 4️⃣ Increment response count
      await prisma.form.update({
        where: { formId },
        data: {
          responseCount: { increment: 1 },
        },
      });
  
      res.json({
        message: "Form submitted successfully",
        responseId: response.responseId,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Something went wrong",
      });
    }
  });



  
app.get("/form/:formId/stats", async (req, res) => {
  const { formId } = req.params;

  const responses = await prisma.response.findMany({
    where: { formId }
  });

  const totalScore = responses.reduce(
    (sum, r) => sum + r.submissionScore,
    0
  );

  res.json({
    totalResponses: responses.length,
    averageScore:
      responses.length === 0 ? 0 : totalScore / responses.length
  });
  });

app.get("/form/:formId/responses", async (req, res) => {
    try {
      const { formId } = req.params;
  
      const form = await prisma.form.findUnique({
        where: { formId },
        include: {
          responses: {
            orderBy: { createdAt: "asc" },
            include: {
              values: {
                include: { field: true }
              }
            }
          }
        }
      });
  
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
  
      const responses = form.responses.map((r, index) => ({
        attempt: index + 1,
        responseId: r.responseId,
        score: r.score,
        submittedAt: r.createdAt,
        answers: r.values.map(v => ({
          fieldLabel: v.field.label,
          value: v.value
        }))
      }));
  
      res.json({
        formId: form.formId,
        title: form.title,
        totalResponses: form.responseCount, // ✅ from Form
        responses
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });
  

app.listen(3001, () => {
  console.log("🚀 Server running on http://localhost:3001");
});
