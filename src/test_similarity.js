const stringSimilarity = require("string-similarity");

function normalize(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ""); // remove punctuation
}

// Two sample user answers and the correct answer
const correctAnswer = "Blue";

const userAnswers = [
  "blue",
  "Blue",
  "BLUE",
  " blue ",
  "Blue!",
  "bLUe",
  "my favorite is blue",
  "blueeeeee",
];

userAnswers.forEach((answer) => {
  const normalizedUser = normalize(answer);
  const normalizedCorrect = normalize(correctAnswer);

  const similarity = stringSimilarity.compareTwoStrings(
    normalizedUser,
    normalizedCorrect
  );

  console.log(
    `User answer: "${answer}" | Normalized: "${normalizedUser}" | Similarity: ${similarity.toFixed(
      3
    )}`
  );
});
