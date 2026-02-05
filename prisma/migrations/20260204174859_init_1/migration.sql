-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'RADIO', 'CHECKBOX', 'SELECT');

-- CreateTable
CREATE TABLE "Form" (
    "formId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("formId")
);

-- CreateTable
CREATE TABLE "Field" (
    "fieldId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "formId" TEXT NOT NULL,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("fieldId")
);

-- CreateTable
CREATE TABLE "Option" (
    "optionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("optionId")
);

-- CreateTable
CREATE TABLE "Response" (
    "responseId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "submissionScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("responseId")
);

-- CreateTable
CREATE TABLE "Value" (
    "valueId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Value_pkey" PRIMARY KEY ("valueId")
);

-- AddForeignKey
ALTER TABLE "Field" ADD CONSTRAINT "Field_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("formId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("fieldId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("formId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Value" ADD CONSTRAINT "Value_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("responseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Value" ADD CONSTRAINT "Value_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("fieldId") ON DELETE RESTRICT ON UPDATE CASCADE;
