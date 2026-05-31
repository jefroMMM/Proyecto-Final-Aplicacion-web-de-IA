"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewInterviewPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/interviews/new");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-sm text-muted-foreground">
      Redirigiendo a nueva entrevista...
    </div>
  );
}
