import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { db } from "@/firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth } from "firebase/auth";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

interface QuizData {
  id: string;
  courseId: string;
  courseTitle: string;
  passingScore: number;
  questions: QuizQuestion[];
  totalPoints: number;
  createdAt: any;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  role: string;
  // Add other fields as needed
}

const ExamView: React.FC = () => {
  const navigate = useNavigate();
  const { moduleId } = useParams<{ moduleId: string }>();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes in seconds
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  // Fetch quiz data and user data from Firebase
  useEffect(() => {
    if (!moduleId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch quiz data
        const quizRef = doc(db, "quizzes", "6valsAoRky9Zkv74pWJv");
        const quizSnap = await getDoc(quizRef);
        
        if (quizSnap.exists()) {
          const quizData = quizSnap.data() as QuizData;
          if (quizData.courseId === moduleId) {
            setQuiz({
              ...quizData,
              id: quizSnap.id
            });
          }
        }

        // Fetch user data if userId exists
        if (userId) {
          const userRef = doc(db, "users", userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserData(userSnap.data() as UserData);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [moduleId, userId]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !examSubmitted && quiz) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !examSubmitted && quiz) {
      handleSubmitExam();
    }
  }, [timeRemaining, examSubmitted, quiz]);

  // Calculate progress percentage
  const progressPercentage = quiz 
    ? (Object.keys(answers).length / quiz.questions.length) * 100
    : 0;

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Handle answer selection
  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: answer,
    }));
  };

  // Calculate exam score
  const calculateScore = () => {
    if (!quiz) return 0;
    
    let earnedPoints = 0;
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        earnedPoints += question.points;
      }
    });
    return Math.round((earnedPoints / quiz.totalPoints) * 100);
  };

  // Handle exam submission
  const handleSubmitExam = async () => {
    if (!quiz || !userId) return;
    
    setExamSubmitted(true);
    const score = calculateScore();
    setShowResults(true);

    try {
      // Update user progress in Firestore
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        completedQuizzes: arrayUnion({
          quizId: quiz.id,
          courseId: quiz.courseId,
          score,
          date: new Date().toISOString(),
          passed: score >= quiz.passingScore
        })
      });
    } catch (error) {
      console.error("Error saving quiz results:", error);
    }
  };

  // Check if quiz is passed
  const isPassed = () => {
    if (!quiz) return false;
    return calculateScore() >= quiz.passingScore;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Quiz Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The quiz for this module could not be loaded.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Module ID: {moduleId}
            </p>
            <p className="text-sm text-muted-foreground">
              Expected quiz ID: 6valsAoRky9Zkv74pWJv
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/")} className="w-full">
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {!showResults ? (
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{quiz.courseTitle} Quiz</h1>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{formatTime(timeRemaining)}</span>
            </div>
          </div>

          <Progress value={progressPercentage} className="mb-6" />

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </h3>
                <p className="text-lg">
                  {quiz.questions[currentQuestionIndex].question}
                </p>
                <div className="space-y-2">
                  {quiz.questions[currentQuestionIndex].options.map((option, i) => (
                    <Button
                      key={i}
                      variant={
                        answers[currentQuestionIndex] === option
                          ? "default"
                          : "outline"
                      }
                      className="w-full justify-start"
                      onClick={() => handleAnswerSelect(currentQuestionIndex, option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (currentQuestionIndex > 0) {
                  setCurrentQuestionIndex(currentQuestionIndex - 1);
                }
              }}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <Button
                onClick={() => {
                  if (currentQuestionIndex < quiz.questions.length - 1) {
                    setCurrentQuestionIndex(currentQuestionIndex + 1);
                  }
                }}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setShowConfirmSubmit(true)}
                disabled={Object.keys(answers).length < quiz.questions.length}
              >
                Submit Quiz
              </Button>
            )}
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-medium mb-2">Question Navigation</h3>
            <div className="flex flex-wrap gap-2">
              {quiz.questions.map((_, index) => (
                <Button
                  key={index}
                  variant={answers[index] ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={
                    currentQuestionIndex === index ? "ring-2 ring-primary" : ""
                  }
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Quiz Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6">
              {isPassed() ? (
                <div className="flex flex-col items-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mb-2" />
                  <h2 className="text-xl font-bold text-green-500">
                    Congratulations! You Passed
                  </h2>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <XCircle className="h-16 w-16 text-red-500 mb-2" />
                  <h2 className="text-xl font-bold text-red-500">
                    Sorry! You Did Not Pass
                  </h2>
                </div>
              )}

              <div className="w-full">
                <div className="flex justify-between mb-2">
                  <span>Your Score:</span>
                  <span className="font-bold">{calculateScore()}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Passing Score:</span>
                  <span>{quiz.passingScore}%</span>
                </div>

                <Progress
                  value={calculateScore()}
                  className="mt-2"
                  indicatorColor={isPassed() ? "bg-green-500" : "bg-red-500"}
                />
              </div>

              <div className="w-full border-t pt-4 mt-4">
                <h3 className="font-medium mb-2">Question Summary:</h3>
                <div className="space-y-2">
                  {quiz.questions.map((question, index) => {
                    const isCorrect = answers[index] === question.correctAnswer;
                    return (
                      <div key={index} className="flex items-start gap-2">
                        <div
                          className={`mt-0.5 ${isCorrect ? "text-green-500" : "text-red-500"}`}
                        >
                          {isCorrect ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm">
                            Question {index + 1}: {question.question}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Your answer: {answers[index] || "Not answered"}
                          </p>
                          {!isCorrect && (
                            <p className="text-xs text-green-600">
                              Correct answer: {question.correctAnswer}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            {isPassed() ? (
              <>
                <Button
                  onClick={() => setShowCertificate(true)}
                  variant="outline"
                >
                  Generate Certificate
                </Button>
                <Button onClick={() => navigate("/")}>Return to Dashboard</Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setAnswers({});
                    setCurrentQuestionIndex(0);
                    setExamSubmitted(false);
                    setShowResults(false);
                    setTimeRemaining(1800);
                  }}
                  variant="outline"
                >
                  Retry Quiz
                </Button>
                <Button onClick={() => navigate("/")}>Return to Dashboard</Button>
              </>
            )}
          </CardFooter>
        </Card>
      )}

      {/* Confirm Submit Dialog */}
      <AlertDialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your quiz? You won't be able to
              change your answers after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitExam}>
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Certificate Dialog */}
      <Dialog open={showCertificate} onOpenChange={setShowCertificate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Certificate of Completion</DialogTitle>
          </DialogHeader>
          <div className="border-4 border-double border-primary/20 p-6 text-center">
            <h2 className="text-2xl font-serif mb-4">
              Certificate of Completion
            </h2>
            <p className="mb-2">This certifies that</p>
            <p className="text-xl font-bold mb-2">
              {userData?.firstName && userData?.lastName 
                ? `${userData.firstName} ${userData.lastName}`
                : auth.currentUser?.email?.split('@')[0] || "Participant"}
            </p>
            <p className="mb-4">has successfully completed</p>
            <p className="text-lg font-medium mb-6">{quiz.courseTitle} Quiz</p>
            <p className="text-sm">Score: {calculateScore()}%</p>
            <p className="text-sm mt-2">
              Date: {new Date().toLocaleDateString()}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCertificate(false)}>Close</Button>
            <Button variant="outline">Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamView;  