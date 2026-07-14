import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" data-testid="unauthorized-page">
      <div className="text-center max-w-md">
        <ShieldAlert className="w-14 h-14 mx-auto text-red-400" />
        <h1 className="mt-4 text-2xl font-semibold text-white">Permission denied</h1>
        <p className="text-slate-400 mt-2 text-sm">You do not have permission to access this page.</p>
        <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700"><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
    </div>
  );
}
