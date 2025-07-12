import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const Unauthorized = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h1 className="text-2xl font-bold">Unauthorized Access</h1>
      <p>You don't have permission to view this page</p>
      <Link to="/" className="text-primary underline">
        Return to Home
      </Link>
    </div>
  );
};

export default Unauthorized; // Make sure this default export exists