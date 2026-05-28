"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { AppLayout } from "@/components/layout/app-layout";
import { UploadCard } from "@/components/interviews/upload-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createInterview } from "@/lib/services/interviews";
import { uploadCv, uploadJobDescription } from "@/lib/services/uploads";

type UploadStatus = "idle" | "uploading" | "indexed" | "error";

export default function NewInterviewPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [candidateName, setCandidateName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [cvStatus, setCvStatus] = useState<UploadStatus>("idle");
  const [jobStatus, setJobStatus] = useState<UploadStatus>("idle");
  const [cvProgress, setCvProgress] = useState(0);
  const [jobProgress, setJobProgress] = useState(0);
  const [createdInterviewId, setCreatedInterviewId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cvFile || !jobFile) {
      showToast({ kind: "error", title: "Missing files", description: "Upload both CV and job description." });
      return;
    }

    setSubmitting(true);
    try {
      const interview = await createInterview({
        user: { name: ownerName, email: ownerEmail },
        candidate_name: candidateName,
        job_title: jobTitle,
      });
      setCreatedInterviewId(interview.id);

      setCvStatus("uploading");
      setCvProgress(45);
      await uploadCv(interview.id, cvFile);
      setCvProgress(100);
      setCvStatus("indexed");

      setJobStatus("uploading");
      setJobProgress(45);
      await uploadJobDescription(interview.id, jobFile);
      setJobProgress(100);
      setJobStatus("indexed");

      showToast({ kind: "success", title: "Interview ready", description: "Documents were uploaded and indexed." });
    } catch (error) {
      setCvStatus((current) => (current === "uploading" ? "error" : current));
      setJobStatus((current) => (current === "uploading" ? "error" : current));
      showToast({
        kind: "error",
        title: "Could not create interview",
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <p className="text-sm text-primary">Setup</p>
        <h1 className="mt-1 text-3xl font-semibold">New interview</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Create the interview, upload the candidate context, and let the backend index everything for RAG before starting voice mode.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Interview details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="candidate">Candidate name</Label>
              <Input id="candidate" required value={candidateName} onChange={(event) => setCandidateName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job">Position</Label>
              <Input id="job" required value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Interviewer name</Label>
                <Input id="ownerName" required value={ownerName} onChange={(event) => setOwnerName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Interviewer email</Label>
                <Input id="ownerEmail" required type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} />
              </div>
            </div>
            <Button
              type="submit"
              disabled={
                submitting ||
                !candidateName ||
                !jobTitle ||
                !ownerName ||
                !ownerEmail ||
                !cvFile ||
                !jobFile
              }
              className="w-full"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create and index
            </Button>
            {createdInterviewId ? (
              <Button type="button" variant="secondary" className="w-full" onClick={() => router.push(`/interviews/${createdInterviewId}`)}>
                Start interview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <UploadCard
            title="Candidate CV"
            description="PDF file. It will be transcribed into chunks and embedded by the backend."
            accept="application/pdf,.pdf"
            file={cvFile}
            progress={cvProgress}
            status={cvStatus}
            onFileChange={(file) => {
              setCvFile(file);
              setCvStatus("idle");
              setCvProgress(0);
            }}
          />
          <UploadCard
            title="Job Description"
            description="PDF or TXT file. Used by the agent to adapt interview difficulty and topics."
            accept="application/pdf,text/plain,.pdf,.txt"
            file={jobFile}
            progress={jobProgress}
            status={jobStatus}
            onFileChange={(file) => {
              setJobFile(file);
              setJobStatus("idle");
              setJobProgress(0);
            }}
          />
          {!createdInterviewId ? (
            <EmptyState title="RAG indexing pending" description="After submission, upload responses confirm that the backend extracted text and indexed embeddings." />
          ) : null}
        </div>
      </form>
    </AppLayout>
  );
}
