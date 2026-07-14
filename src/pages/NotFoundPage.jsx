import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <Compass className="w-14 h-14 mx-auto text-blue-400" />
        <div className="mt-4 text-6xl font-semibold font-numeric text-white">404</div>
        <div className="text-slate-400 mt-2">This page could not be found.</div>
        <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700"><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
    </div>
  );
}
