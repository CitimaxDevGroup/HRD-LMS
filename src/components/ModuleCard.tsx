import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, BookOpen } from "lucide-react";

interface ModuleCardProps {
  id: string;
  title: string;
  description: string;
  progress: number;
  lessonCount: number;
  estimatedTime: string;
  isCompleted: boolean;
  onClick?: () => void;
}

const ModuleCard = ({
  id = "module-1",
  title = "Introduction to Company",
  description = "Learn about our company history, values, and culture in this introductory module.",
  progress = 0,
  lessonCount = 5,
  estimatedTime = "30 min",
  isCompleted = false,
  onClick = () => {},
}: ModuleCardProps) => {
  return (
    <Card className="w-[350px] h-[280px] flex flex-col bg-white shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <BookOpen size={16} />
            <span>{lessonCount} lessons</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={16} />
            <span>{estimatedTime}</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={onClick}
          className="w-full"
          variant={isCompleted ? "outline" : "default"}
        >
          {isCompleted
            ? "Review Module"
            : progress > 0
              ? "Continue"
              : "Start Module"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ModuleCard;
