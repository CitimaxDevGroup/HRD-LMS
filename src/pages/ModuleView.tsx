import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
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
  BookOpen,
  Menu,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      {/* Enhanced Header */}
      <header className="sticky top-0 z-30 border-b bg-background shadow-sm">
        <div className="container px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => navigate("/")} 
                variant="outline" 
                size="icon"
                className="sm:hidden"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {module.title}
              </h1>
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="md:hidden ml-auto"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-1 min-w-[150px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-medium">{module.progress}%</span>
              </div>
              <Progress value={module.progress || 0} className="h-2" />
            </div>
            
            <div className="flex gap-2">
              {module.progress === 100 && (
                <Button 
                  onClick={handleContinueToQuiz} 
                  className="hidden sm:block"
                  disabled={saving}
                >
                  Take Quiz
                </Button>
              )}
              <Button 
                onClick={() => navigate("/")} 
                variant="outline"
                className="hidden sm:block"
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container flex flex-1 flex-col md:flex-row gap-6 p-4 md:p-6">
        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="md:hidden mb-4 bg-card rounded-lg border shadow-sm">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-3 flex items-center justify-between">
                Lessons
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSidebarOpen(false)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </h2>
              <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                {module.modules.map((moduleItem, index) => (
                  <li key={moduleItem.id}>
                    <button
                      onClick={() => {
                        handleLessonSelect(index);
                        setSidebarOpen(false);
                      }}
                      className={`flex items-center w-full p-3 rounded-md text-left transition-colors ${
                        currentLessonIndex === index 
                          ? "bg-primary/10 border-l-4 border-primary" 
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <span className="mr-3">
                        {moduleItem.completed ? (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </span>
                      <span className="flex-1 font-medium">{moduleItem.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <div className="hidden md:block w-full md:w-1/4 lg:w-1/5 bg-card rounded-lg border shadow-sm h-fit sticky top-24">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-3">Lessons</h2>
            <ul className="space-y-1">
              {module.modules.map((moduleItem, index) => (
                <li key={moduleItem.id}>
                  <button
                    onClick={() => handleLessonSelect(index)}
                    className={`flex items-center w-full p-3 rounded-md text-left transition-colors ${
                      currentLessonIndex === index 
                        ? "bg-primary/10 border-l-4 border-primary" 
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <span className="mr-3">
                      {moduleItem.completed ? (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="flex-1 font-medium truncate">{moduleItem.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Lesson Content */}
        <div className="flex-1">
          <Card className="h-full shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {currentModuleItem?.title}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Lesson {currentLessonIndex + 1} of {module.modules.length}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handlePrevious}
                    disabled={currentLessonIndex === 0 || saving}
                    className="md:hidden"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleNext}
                    disabled={saving}
                    className="md:hidden"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <Separator />
            
            <CardContent className="p-0">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="w-full rounded-none border-b bg-transparent px-6 py-3">
                  <TabsTrigger 
                    value="content" 
                    className="data-[state=active]:shadow-none py-2 px-4"
                  >
                    Lesson Content
                  </TabsTrigger>
                  <TabsTrigger 
                    value="notes" 
                    className="data-[state=active]:shadow-none py-2 px-4"
                  >
                    My Notes
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="content" className="p-6">
                  <div className="prose prose-slate max-w-none">
                    <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                        <ReactMarkdown
                          children={currentModuleItem?.content || "This lesson has no content yet."}
                          components={{
                            h1: (props) => <h1 {...props} className="text-2xl font-bold my-4" />,
                            h2: (props) => <h2 {...props} className="text-xl font-semibold my-3" />,
                            h3: (props) => <h3 {...props} className="text-lg font-medium my-2" />,
                            p: (props) => <p {...props} className="my-2 leading-relaxed text-gray-800" />,
                            ul: (props) => <ul {...props} className="list-disc pl-6 my-2" />,
                            ol: (props) => <ol {...props} className="list-decimal pl-6 my-2" />,
                            li: (props) => <li {...props} className="mb-1" />,
                            code: (props) => <code {...props} className="bg-muted px-1 py-0.5 rounded text-sm" />,
                            pre: (props) => <pre {...props} className="bg-muted p-4 rounded my-2 overflow-x-auto text-sm" />,
                            blockquote: (props) => <blockquote {...props} className="border-l-4 pl-4 italic text-muted-foreground my-2" />
                          }}
                        />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="notes" className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Your Notes</h3>
                      <p className="text-sm text-muted-foreground">
                        Private to you - saved automatically
                      </p>
                    </div>
                    <textarea
                      className="w-full min-h-[300px] p-4 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Write your notes here. These will be saved automatically..."
                      value={currentModuleItem ? notes[currentModuleItem.id] || "" : ""}
                      onChange={(e) => currentModuleItem && setNotes(prev => ({
                        ...prev,
                        [currentModuleItem.id]: e.target.value
                      }))}
                      onBlur={(e) => currentModuleItem && saveNotes(currentModuleItem.id, e.target.value)}
                      disabled={saving}
                    />
                    {saving && (
                      <p className="text-sm text-primary flex items-center">
                        <Circle className="h-3 w-3 mr-2 animate-pulse" />
                        Saving notes...
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <Separator />
            
            <CardFooter className="flex flex-col gap-3 sm:flex-row justify-between p-4">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentLessonIndex === 0 || saving}
                  className="flex-1 sm:flex-initial"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="sm:hidden flex-1"
                >
                  Dashboard
                </Button>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                {currentModuleItem && !currentModuleItem.completed && (
                  <Button 
                    onClick={markModuleComplete} 
                    variant="secondary"
                    disabled={saving}
                    className="flex-1 sm:flex-initial"
                  >
                    {saving ? "Saving..." : "Mark Complete"}
                  </Button>
                )}
                
                <Button 
                  onClick={handleNext}
                  disabled={saving}
                  className="flex-1 sm:flex-initial"
                >
                  {currentLessonIndex === module.modules.length - 1
                    ? module.progress === 100 
                      ? "Take Quiz" 
                      : "Finish"
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