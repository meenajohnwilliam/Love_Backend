const express = require("express");
const app = express();
const authRoutes = require('./src/auth')
const cookieParser = require("cookie-parser");
const prisma =  require("./src/prisma")
app.use(express.json());
app.use(cookieParser());
app.use("/",authRoutes)




app.post("/form", async (req, res) => {
    try {
      const { title, description } = req.body;
  
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
  
      const form = await prisma.form.create({
        data: {
          title,
          description,
          status: "DRAFT"
        }
      });
  
      res.status(201).json({
        message: "Form created successfully",
        form
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create form" });
    }
  });
  


/**
 * 2️⃣ Add Field (with options if needed)
 */
app.post("/forms/:formId/fields", async (req, res) => {
    try {
      const { formId } = req.params;
      const { label, type, order, options } = req.body;
  
      const field = await prisma.field.create({
        data: {
          label,
          type,
          order,
          formId,
  
          // create options only if provided
          options: options
            ? {
                create: options.map((opt) => ({
                  label: opt
                }))
              }
            : undefined
        },
  
        // 👇 THIS LINE RETURNS OPTIONS IN RESPONSE
        include: {
          options: true
        }
      });
  
      res.json(field);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
/**
 * Publish Form
 */
app.put("/form/:formId/publish", async (req, res) => {
    try {
      const { formId } = req.params;
  
      const form = await prisma.form.update({
        where: { formId },
        data: { status: "PUBLISHED" }
      });
  
      res.json({
        message: "Form published",
        publicLink: `/form/${formId}`,
        form
      });
  
    } catch (error) {
      console.error("Publish form error:", error);
  
      res.status(500).json({
        message: "Failed to publish form"
      });
    }
  });


  /**
 * Get Public Form
 */
  app.get("/form/:formId", async (req, res) => {
    try {
      const { formId } = req.params;
  
      // 1️⃣ Get form by unique ID
      const form = await prisma.form.findUnique({
        where: { formId },
        include: {
          fields: {
            include: { options: true }
          }
        }
      });
  
      // 2️⃣ Check existence
      if (!form) {
        return res.status(404).json({
          message: "Form not found"
        });
      }
  
      // 3️⃣ Check publish status
      if (form.status !== "PUBLISHED") {
        return res.status(403).json({
          message: "Form not published yet"
        });
      }
  
      // 4️⃣ Send public form
      res.json(form);
  
    } catch (error) {
      console.error("Get form error:", error);
      res.status(500).json({
        message: "Server error"
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
  

/**
 * 6️⃣ Get Response Count & Avg Score
 */
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
