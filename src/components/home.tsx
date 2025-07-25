import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Bell, LogOut, CheckCircle, BookOpen, Award, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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

interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: "not-started" | "in-progress" | "completed";
  imageUrl: string;
  examCompleted: boolean;
  examScore?: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: string;
  progress?: {
    [moduleId: string]: {
      progress: number;
      completedLessons: string[];
    };
  };
  completedQuizzes?: Array<{
    quizId: string;
    courseId: string;
    score: number;
    passed: boolean;
    date: string;
  }>;
}

export default function Home() {
  const [modules, setModules] = useState<Module[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setLogoutLoading(true);
    setLogoutError(null);
    
    try {
      await signOut(auth);
      setUserData(null);
      setModules([]);
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
      setLogoutError("Failed to log out. Please try again.");
    } finally {
      setLogoutLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const usersRef = collection(db, "users");
          const querySnapshot = await getDocs(usersRef);
          
          let userDoc = null;
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.email === currentUser.email) {
              userDoc = { id: doc.id, ...data };
            }
          });

          if (userDoc) {
            setUserData(userDoc as UserData);
            await fetchModules(userDoc.id);
          } else {
            setError("User document not found");
            setLoading(false);
          }
        } catch (err) {
          console.error("Error loading user:", err);
          setError("Failed to load user data");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchModules = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const [coursesSnapshot, userSnap] = await Promise.all([
        getDocs(collection(db, "courses")),
        getDoc(doc(db, "users", userId)),
      ]);

      if (coursesSnapshot.empty) {
        setModules([]);
        setLoading(false);
        return;
      }

      if (!userSnap.exists()) {
        throw new Error("User progress data not found");
      }

      const userProgressData = userSnap.data();
      const fetchedModules: Module[] = [];

      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        const courseId = courseDoc.id;

        const courseProgressData = userProgressData.progress?.[courseId];
        const courseProgress = courseProgressData?.progress ?? 0;

        let examCompleted = false;
        let examScore: number = 0;

        if (Array.isArray(userProgressData.completedQuizzes)) {
          const quizResults = userProgressData.completedQuizzes.filter(
            (quiz: any) => quiz.courseId === courseId
          );

          if (quizResults.length > 0) {
            const mostRecentQuiz = quizResults.reduce((latest: any, current: any) =>
              new Date(current.date) > new Date(latest.date) ? current : latest
            );

            examCompleted = mostRecentQuiz.passed;
            const rawScore = mostRecentQuiz.score;
            const parsedScore = typeof rawScore === "number" ? rawScore : parseFloat(String(rawScore));
            examScore = isNaN(parsedScore) ? 0 : parsedScore;
          }
        }

        // Determine status based on completion criteria
        let status: "not-started" | "in-progress" | "completed";
        if (courseProgress === 100 && examCompleted) {
          status = "completed";
        } else if (courseProgress > 0 || examCompleted) {
          status = "in-progress";
        } else {
          status = "not-started";
        }

        fetchedModules.push({
          id: courseId,
          title: courseData.title || "Untitled Module",
          description: courseData.description || "No description available",
          progress: courseProgress,
          status,
          imageUrl: courseData.imageUrl || "/default-module.jpg",
          examCompleted,
          examScore,
        });
      }

      setModules(fetchedModules);
      setLoading(false);
    } catch (error) {
      console.error("Error loading modules:", error);
      setError(error instanceof Error ? error.message : "Failed to load modules");
      setModules([]);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        <Button asChild>
          <Link to="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              {logoutLoading ? "Logging out..." : "Log out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

<header className="bg-white border-b border-gray-200 sticky top-0 z-10">
  <div className="container mx-auto px-4 py-4 flex justify-between items-center">
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <img 
          src="https://lh3.googleusercontent.com/d/1_8AYOCP4TMqxDljVtvGEseGFS_zKh9Cb" 
          alt="Citimax Group Inc."
          className="h-10" // Adjust height as needed
        />
        <h1 className="text-xl font-semibold text-gray-800">Citimax Group Inc.</h1>
      </div>
      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
        {userData.department} Department
      </span>
    </div>

    <div className="flex items-center space-x-4">
      <Button variant="ghost" size="icon">
        <Bell className="h-5 w-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`}
                alt={userData.name}
              />
             <AvatarFallback>
                {typeof userData.name === 'string' && userData.name.length > 0
                  ? userData.name.charAt(0)
                  : "?"}
             </AvatarFallback>

            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="flex items-center justify-start gap-2 p-2">
            <div className="flex flex-col space-y-1 leading-none">
              <p className="font-medium">{userData.name}</p>
              <p className="text-sm text-muted-foreground">
                {userData.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {userData.role}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShowLogoutConfirm(true)}>
            <div className="flex items-center">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</header>
      <main className="container mx-auto px-4 py-8">
        {logoutError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{logoutError}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => userData && fetchModules(userData.id)} 
                  className="mt-2 text-sm text-red-800 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-2xl font-semibold mb-2">Welcome, {userData.name}!</h2>
            <p className="text-gray-600 mb-4">
              {userData.role === "Admin" 
                ? "Admin Dashboard - Manage training progress"
                : "Complete your required training modules below."}
            </p>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {userData.role === "Admin" ? "All Training Modules" : "Your Training Modules"}
            </h2>
          </div>

          {modules.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">No Modules Available</h3>
                  <p className="text-sm text-yellow-700">
                    There are currently no training modules assigned to you.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module) => (
                <div 
                  key={module.id} 
                  className="border rounded-lg overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow"
                >
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">{module.title}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">{module.description}</p>
                    
                    <div className="flex justify-between items-center">
                      {module.status === "completed" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </span>
                      ) : module.status === "in-progress" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Not Started
                        </span>
                      )}
                      
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/module/${module.id}`}>
                          {module.status === "not-started" ? "Start" : "Continue"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Citimax Group Inc.</p>
        </div>
      </footer>
    </div>
  );
}