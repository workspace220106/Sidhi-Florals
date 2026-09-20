import { Link } from "wouter";
export default function NotFound() {
  return (
    <div className="card p-10 text-center space-y-3">
      <h1 className="text-3xl">Page not found</h1>
      <Link href="/" className="btn-primary inline-flex">Back to Dashboard</Link>
    </div>
  );
}
