import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">404 Not Found</h1>
      <p>The page you're looking for doesn't exist</p>
      <Link to="/" className="text-primary underline">
        Return to Home
      </Link>
    </div>
  );
}