import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

export interface Option {
  id: string;
  text: string;
}

export interface QuestionCardProps {
  questionId: string;
  questionNumber: number;
  questionText: string;
  questionType: "multiple-choice" | "true-false";
  options: Option[];
  correctAnswerId?: string;
  onAnswerSelect: (questionId: string, answerId: string) => void;
  selectedAnswerId?: string;
  showFeedback?: boolean;
}

const QuestionCard = ({
  questionId = "1",
  questionNumber = 1,
  questionText = "What is the primary goal of the onboarding process?",
  questionType = "multiple-choice",
  options = [
    { id: "a", text: "To complete paperwork" },
    { id: "b", text: "To integrate new employees into the company culture" },
    { id: "c", text: "To evaluate employee performance" },
    { id: "d", text: "To assign work tasks" },
  ],
  correctAnswerId = "b",
  onAnswerSelect = () => {},
  selectedAnswerId,
  showFeedback = false,
}: QuestionCardProps) => {
  const [localSelectedAnswer, setLocalSelectedAnswer] = useState<
    string | undefined
  >(selectedAnswerId);

  const handleAnswerSelect = (answerId: string) => {
    setLocalSelectedAnswer(answerId);
    onAnswerSelect(questionId, answerId);
  };

  const isCorrect = showFeedback && localSelectedAnswer === correctAnswerId;
  const isIncorrect =
    showFeedback &&
    localSelectedAnswer &&
    localSelectedAnswer !== correctAnswerId;

  // Generate true/false options if question type is true-false
  const displayOptions =
    questionType === "true-false"
      ? [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ]
      : options;

  return (
    <Card className="w-full max-w-3xl mx-auto mb-6 bg-white">
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="text-lg">
          Question {questionNumber}: {questionText}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <RadioGroup
          value={localSelectedAnswer}
          onValueChange={handleAnswerSelect}
          className="space-y-3"
        >
          {displayOptions.map((option) => {
            const isOptionCorrect =
              showFeedback && option.id === correctAnswerId;
            const isOptionSelected = localSelectedAnswer === option.id;

            return (
              <div
                key={option.id}
                className={`flex items-center space-x-2 p-3 rounded-md border ${
                  isOptionSelected && showFeedback
                    ? isOptionCorrect
                      ? "border-green-500 bg-green-50"
                      : "border-red-500 bg-red-50"
                    : "border-gray-200 hover:bg-slate-50"
                }`}
              >
                <RadioGroupItem
                  value={option.id}
                  id={`${questionId}-${option.id}`}
                  disabled={showFeedback}
                />
                <Label
                  htmlFor={`${questionId}-${option.id}`}
                  className="flex-grow cursor-pointer"
                >
                  {option.text}
                </Label>
                {showFeedback && isOptionCorrect && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {showFeedback && isOptionSelected && !isOptionCorrect && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            );
          })}
        </RadioGroup>

        {showFeedback && (
          <div className="mt-4 p-3 rounded-md border">
            {isCorrect ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Correct answer!</span>
              </div>
            ) : isIncorrect ? (
              <div className="flex items-center text-red-600">
                <XCircle className="h-5 w-5 mr-2" />
                <span>
                  Incorrect. The correct answer is:{" "}
                  {displayOptions.find((o) => o.id === correctAnswerId)?.text}
                </span>
              </div>
            ) : (
              <div className="text-amber-600">Please select an answer.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuestionCard;
