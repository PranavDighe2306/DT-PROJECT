// Supplementary questions: multi-select, assertion-reason and worked numericals.
// Loaded after question_bank.js. Items start unreviewed.
const QUESTION_BANK_EXTRA = {
 "questions": [
  {
   "id": "math1_m1_matrices_x01",
   "subject": "math1",
   "topic": "m1_matrices",
   "type": "multi",
   "difficulty": "medium",
   "text": "Which of the following statements about an n × n matrix A are true? (Select all that apply)",
   "options": [
    "If det(A) ≠ 0, then A is invertible",
    "The eigenvalues of A are the roots of det(A − λI) = 0",
    "If A is invertible, its rank is n",
    "Every square matrix has an inverse"
   ],
   "answer": [
    0,
    1,
    2
   ],
   "explanation": "A square matrix is invertible exactly when its determinant is non-zero, which is exactly when its rank is n. Eigenvalues solve the characteristic equation. Singular matrices have no inverse, so the last statement is false.",
   "verified": "draft-review-needed",
   "reviewed": false
  },
  {
   "id": "dm_graphs_x01",
   "subject": "discrete",
   "topic": "dm_graphs",
   "type": "multi",
   "difficulty": "medium",
   "text": "Which of these graphs are bipartite? (Select all that apply)",
   "options": [
    "Any tree",
    "The cycle C4 (4 vertices)",
    "The cycle C5 (5 vertices)",
    "The complete graph K2"
   ],
   "answer": [
    0,
    1,
    3
   ],
   "explanation": "A graph is bipartite if and only if it has no odd cycle. Trees have no cycles, C4 is an even cycle and K2 is a single edge. C5 is an odd cycle, so it is not bipartite.",
   "verified": "draft-review-needed",
   "reviewed": false
  },
  {
   "id": "de_logic_x01",
   "subject": "digital",
   "topic": "de_logic",
   "type": "multi",
   "difficulty": "medium",
   "text": "Which of these gates are universal gates? (Select all that apply)",
   "options": [
    "NAND",
    "NOR",
    "XOR",
    "AND"
   ],
   "answer": [
    0,
    1
   ],
   "explanation": "NAND and NOR can each implement NOT, AND and OR, so any Boolean function can be built from either one alone. XOR and AND cannot do this on their own.",
   "verified": "draft-review-needed",
   "reviewed": false
  },
  {
   "id": "oop_binding_x01",
   "subject": "oop",
   "topic": "oop_binding",
   "type": "multi",
   "difficulty": "medium",
   "text": "Which of the following are forms of compile-time polymorphism in C++? (Select all that apply)",
   "options": [
    "Function overloading",
    "Operator overloading",
    "Overriding a virtual function",
    "Constructor overloading"
   ],
   "answer": [
    0,
    1,
    3
   ],
   "explanation": "Overloading (functions, operators, constructors) is resolved by the compiler from the argument types. Overriding a virtual function is resolved at run time through the object's dynamic type.",
   "verified": "draft-review-needed",
   "reviewed": false
  },
  {
   "id": "phy_semiconductor_x01",
   "subject": "physics",
   "topic": "phy_semiconductor",
   "type": "assertion",
   "difficulty": "medium",
   "text": "Assertion (A): The resistivity of an intrinsic semiconductor decreases as its temperature increases.\nReason (R): A higher temperature generates more electron–hole pairs.",
   "options": [
    "Both A and R are true, and R is the correct explanation of A",
    "Both A and R are true, but R is not the correct explanation of A",
    "A is true, but R is false",
    "A is false, but R is true"
   ],
   "answer": 0,
   "explanation": "Heating promotes more electrons across the band gap, increasing the carrier concentration and lowering resistivity. R is therefore the correct explanation of A.",
   "verified": "draft-review-needed",
   "reviewed": false
  },
  {
   "id": "m1_taylor_x01",
   "subject": "math1",
   "topic": "m1_taylor",
   "type": "assertion",
   "difficulty": "medium",
   "text": "Assertion (A): The Maclaurin series of eˣ contains only even powers of x.\nReason (R): A Maclaurin series is the Taylor series expanded about x = 0.",
   "options": [
    "Both A and R are true, and R is the correct explanation of A",
    "Both A and R are true, but R is not the correct explanation of A",
    "A is true, but R is false",
    "A is false, but R is true"
   ],
   "answer": 3,
   "explanation": "The Maclaurin series of eˣ is 1 + x + x²/2! + x³/3! + …, which has every power of x, so A is false. R is the correct definition of a Maclaurin series, so R is true.",
   "verified": "draft-review-needed",
   "reviewed": false
  },
  {
   "id": "de_sequential_x01",
   "subject": "digital",
   "topic": "de_sequential",
   "type": "assertion",
   "difficulty": "medium",
   "text": "Assertion (A): A D flip-flop can store one bit of data.\nReason (R): Its output Q takes the value of input D at the active clock edge and holds it until the next edge.",
   "options": [
    "Both A and R are true, and R is the correct explanation of A",
    "Both A and R are true, but R is not the correct explanation of A",
    "A is true, but R is false",
    "A is false, but R is true"
   ],
   "answer": 0,
   "explanation": "Capturing D on the active edge and holding it is exactly how the flip-flop stores one bit, so R explains A.",
   "verified": "draft-review-needed",
   "reviewed": false
  },
  {
   "id": "chem_corrosion_x01",
   "subject": "chemistry",
   "topic": "chem_corrosion",
   "type": "assertion",
   "difficulty": "medium",
   "text": "Assertion (A): Attaching a block of zinc to an iron structure protects the iron from corrosion.\nReason (R): Zinc is more active than iron, so it corrodes in preference to iron.",
   "options": [
    "Both A and R are true, and R is the correct explanation of A",
    "Both A and R are true, but R is not the correct explanation of A",
    "A is true, but R is false",
    "A is false, but R is true"
   ],
   "answer": 0,
   "explanation": "In sacrificial anodic protection the more active metal acts as the anode and corrodes, while iron becomes the cathode and is protected. R explains A.",
   "verified": "draft-review-needed",
   "reviewed": false
  },
  {
   "id": "math1_m1_matrices_x02",
   "subject": "math1",
   "topic": "m1_matrices",
   "type": "numerical",
   "difficulty": "medium",
   "text": "Find the determinant of the matrix [[2, 3], [1, 4]].",
   "options": [
    "5",
    "11",
    "8",
    "−5"
   ],
   "answer": 0,
   "explanation": "For a 2 × 2 matrix, det = ad − bc, which gives 5.",
   "verified": "draft-review-needed",
   "reviewed": false,
   "steps": [
    "Use det [[a, b], [c, d]] = ad − bc.",
    "Here a = 2, b = 3, c = 1, d = 4.",
    "det = (2)(4) − (3)(1) = 8 − 3 = 5."
   ]
  },
  {
   "id": "dm_counting_x01",
   "subject": "discrete",
   "topic": "dm_counting",
   "type": "numerical",
   "difficulty": "medium",
   "text": "How many distinct arrangements of the letters of the word LEVEL are possible?",
   "options": [
    "30",
    "60",
    "120",
    "15"
   ],
   "answer": 0,
   "explanation": "There are 5 letters with L repeated twice and E repeated twice, so divide 5! by 2! for each repeat.",
   "verified": "draft-review-needed",
   "reviewed": false,
   "steps": [
    "LEVEL has 5 letters: L, E, V, E, L.",
    "L appears 2 times and E appears 2 times; V appears once.",
    "Arrangements = 5! / (2! × 2!) = 120 / 4 = 30."
   ]
  },
  {
   "id": "de_memory_x01",
   "subject": "digital",
   "topic": "de_memory",
   "type": "numerical",
   "difficulty": "medium",
   "text": "A memory chip has 10 address lines and 8 data lines. What is its capacity?",
   "options": [
    "1 KB",
    "8 KB",
    "10 KB",
    "80 bits"
   ],
   "answer": 0,
   "explanation": "10 address lines give 2¹⁰ = 1024 locations, each holding 8 bits (1 byte), so 1024 bytes = 1 KB.",
   "verified": "draft-review-needed",
   "reviewed": false,
   "steps": [
    "Number of locations = 2^(address lines) = 2¹⁰ = 1024.",
    "Each location stores 8 bits = 1 byte.",
    "Capacity = 1024 × 1 byte = 1024 bytes = 1 KB."
   ]
  },
  {
   "id": "m1_ode_x01",
   "subject": "math1",
   "topic": "m1_ode",
   "type": "numerical",
   "difficulty": "medium",
   "text": "Solve dy/dx = 2x with y(0) = 1. What is y(2)?",
   "options": [
    "5",
    "4",
    "3",
    "9"
   ],
   "answer": 0,
   "explanation": "Integrating gives y = x² + C, and y(0) = 1 gives C = 1.",
   "verified": "draft-review-needed",
   "reviewed": false,
   "steps": [
    "Integrate both sides: y = x² + C.",
    "Apply y(0) = 1: 1 = 0 + C, so C = 1.",
    "So y = x² + 1 and y(2) = 4 + 1 = 5."
   ]
  }
 ]
};
