import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  FileText,
} from "lucide-react";
import { db } from "@/firebase";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc,
  arrayUnion,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

interface ModuleItem {
  id: string;
  title: string;
  content: string;
  order: number;
  completed?: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string;
  modules: ModuleItem[];
  category: string;
  status: string;
  progress?: number;
}

interface UserProgress {
  completedLessons: string[];
  progress: number;
  lastUpdated?: string;
}

export default function ModuleView() {
  const navigate = useNavigate();
  const { moduleId } = useParams<{ moduleId: string }>();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!moduleId || !userId) {
      setLoading(false);
      return;
    }

    const fetchModuleAndProgress = async () => {
      try {
        // Fetch module data
        const moduleRef = doc(db, "courses", moduleId);
        const moduleSnap = await getDoc(moduleRef);
        
        if (!moduleSnap.exists()) {
          throw new Error("Module not found");
        }

        const moduleData = moduleSnap.data();
        
        // Fetch user progress
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        let completedModules: string[] = [];
        if (userSnap.exists() && userSnap.data().progress?.[moduleId]) {
          completedModules = userSnap.data().progress[moduleId].completedLessons || [];
        }

        // Prepare modules with completion status
        const modulesWithProgress = (moduleData.modules || []).map((module: any) => ({
          ...module,
          completed: completedModules.includes(module.id)
        }));

        // Calculate progress
        const progress = moduleData.modules 
          ? Math.round((completedModules.length / moduleData.modules.length) * 100)
          : 0;

        // Fetch user notes
        const notesQuery = query(
          collection(db, "users", userId, "notes"),
          where("moduleId", "==", moduleId)
        );
        const notesSnap = await getDocs(notesQuery);
        const notesData: Record<string, string> = {};
        
        notesSnap.forEach(doc => {
          const data = doc.data();
          if (data.lessonId) {
            notesData[data.lessonId] = data.content || "";
          }
        });

        setModule({
          id: moduleId,
          title: moduleData.title || "Untitled Module",
          description: moduleData.description || "",
          modules: modulesWithProgress,
          category: moduleData.category || "",
          status: moduleData.status || "active",
          progress
        });

        setNotes(notesData);
      } catch (error) {
        console.error("Error fetching data:", error);
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchModuleAndProgress();
  }, [moduleId, userId, navigate]);

  const currentModuleItem = module?.modules[currentLessonIndex];

  const handlePrevious = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const handleNext = () => {
    if (!module) return;
    
    if (currentLessonIndex < module.modules.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    } else if (module.progress === 100) {
      navigate(`/exam/${moduleId}`);
    }
  };

  const handleContinueToQuiz = () => {
    navigate(`/exam/${moduleId}`);
  };

  const markModuleComplete = async () => {
    if (!module || !userId || !moduleId || !currentModuleItem) return;
    
    setSaving(true);
    try {
      const updatedModules = [...module.modules];
      updatedModules[currentLessonIndex].completed = true;

      // Calculate progress
      const completedCount = updatedModules.filter(m => m.completed).length;
      const newProgress = Math.round((completedCount / updatedModules.length) * 100);

      // Update user progress
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        [`progress.${moduleId}`]: {
          completedLessons: arrayUnion(currentModuleItem.id),
          progress: newProgress,
          lastUpdated: new Date().toISOString()
        }
      });

      // Log completion
      await addDoc(collection(db, "auditLogs"), {
        userId,
        action: "module_completed",
        moduleId,
        moduleItemId: currentModuleItem.id,
        timestamp: new Date().toISOString(),
        metadata: {
          moduleTitle: currentModuleItem.title,
          courseTitle: module.title
        }
      });

      // Update state
      setModule({
        ...module,
        modules: updatedModules,
        progress: newProgress
      });

      // Navigate if completed
      if (newProgress === 100) {
        navigate(`/exam/${moduleId}`);
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async (moduleItemId: string, content: string) => {
    if (!userId || !moduleId) return;
    
    setSaving(true);
    try {
      // Check for existing note
      const notesQuery = query(
        collection(db, "users", userId, "notes"),
        where("moduleId", "==", moduleId),
        where("lessonId", "==", moduleItemId)
      );
      const notesSnap = await getDocs(notesQuery);
      
      if (notesSnap.empty) {
        // Create new note
        await addDoc(collection(db, "users", userId, "notes"), {
          moduleId,
          lessonId: moduleItemId,
          content,
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Update existing note
        const noteDoc = notesSnap.docs[0];
        await updateDoc(noteDoc.ref, {
          content,
          lastUpdated: new Date().toISOString()
        });
      }

      // Update state
      setNotes(prev => ({
        ...prev,
        [moduleItemId]: content
      }));
    } catch (error) {
      console.error("Error saving notes:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleLessonSelect = (index: number) => {
    if (index >= 0 && index < (module?.modules.length || 0)) {
      setCurrentLessonIndex(index);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Module Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested module could not be loaded.</p>
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
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background p-4">
        <div className="container flex items-center justify-between">
          <h1 className="text-2xl font-bold">{module.title}</h1>
          <div className="flex items-center gap-4">
            <div className="flex-1 mr-4">
              <Progress value={module.progress || 0} className="w-[200px]" />
              <p className="text-sm text-muted-foreground mt-1">
                {module.progress}% Complete
              </p>
            </div>
            {module.progress === 100 && (
              <Button 
                onClick={handleContinueToQuiz} 
                className="mr-2"
                disabled={saving}
              >
                Take Quiz
              </Button>
            )}
            <Button onClick={() => navigate("/")} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container flex flex-1 gap-6 p-4 md:p-8">
        {/* Sidebar */}
        <div className="hidden md:block w-1/4 bg-card rounded-lg border shadow-sm">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Modules</h2>
            <ul className="space-y-2">
              {module.modules.map((moduleItem, index) => (
                <li key={moduleItem.id}>
                  <button
                    onClick={() => handleLessonSelect(index)}
                    className={`flex items-center w-full p-2 rounded-md text-left ${
                      currentLessonIndex === index ? "bg-accent" : "hover:bg-accent/50"
                    }`}
                    disabled={saving}
                  >
                    <span className="mr-2">
                      {moduleItem.completed ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="flex-1 truncate">{moduleItem.title}</span>
                    <FileText className="h-4 w-4 ml-2" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main module content */}
        <div className="flex-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{currentModuleItem?.title}</CardTitle>
              <CardDescription>
                Module {currentLessonIndex + 1} of {module.modules.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="content" className="min-h-[400px]">
                  <div className="prose max-w-none">
                    <p className="text-lg whitespace-pre-line">{currentModuleItem?.content}</p>
                  </div>
                </TabsContent>
                <TabsContent value="notes" className="min-h-[400px]">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Your Notes</h3>
                    <textarea
                      className="w-full h-[300px] p-4 border rounded-md"
                      placeholder="Add your notes here..."
                      value={currentModuleItem ? notes[currentModuleItem.id] || "" : ""}
                      onChange={(e) => {
                        if (currentModuleItem) {
                          setNotes(prev => ({
                            ...prev,
                            [currentModuleItem.id]: e.target.value
                          }));
                        }
                      }}
                      onBlur={(e) => {
                        if (currentModuleItem) {
                          saveNotes(currentModuleItem.id, e.target.value);
                        }
                      }}
                      disabled={saving}
                    />
                    {saving && (
                      <p className="text-sm text-muted-foreground">Saving notes...</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <Separator />
            <CardFooter className="flex justify-between p-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentLessonIndex === 0 || saving}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              <div className="flex gap-2">
                {currentModuleItem && !currentModuleItem.completed && (
                  <Button 
                    onClick={markModuleComplete} 
                    variant="secondary"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Mark as Complete"}
                  </Button>
                )}
                <Button 
                  onClick={handleNext}
                  disabled={saving}
                >
                  {currentLessonIndex === module.modules.length - 1
                    ? module.progress === 100 
                      ? "Continue to Quiz" 
                      : "Finish Module"
                    : "Next"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}