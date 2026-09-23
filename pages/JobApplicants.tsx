import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../services/database";
import { Application, Job } from "../types";
import { ArrowLeft } from "lucide-react";

import { Loading } from "../components/Loading";
import { Button, Card, PageHeader } from "@/components/ui";
import { ApplicationStatusLabel } from "@/utils/statusDisplay";

export const JobApplicants: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [job, setJob] = useState<Job | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        try {
          const [jobData, appsData] = await Promise.all([
            db.getJob(id),
            db.getApplicationsForJob(id),
          ]);
          setJob(jobData);
          setApplicants(appsData);
        } catch (err) {
          console.error("Failed to load applicants", err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [id]);

  const displayStatus = (status: string) => {
    if (status === "Accepted") return "Offer Accepted";
    if (status === "Declined") return "Offer Declined";
    return status;
  };

  if (loading) {
    return <Loading message="Syncing Taskers..." />;
  }
  if (!job)
    return (
      <div className="p-10 text-center font-semibold text-red-600">
        Task designation not found
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-section animate-fade-in">
      <PageHeader
        title="Resolution Candidates"
        description={
          <>
            Managing collaborators for{" "}
            <span className="font-semibold text-primary">{job.title}</span>
          </>
        }
        actions={
          <Button
            type="button"
            variant="ghost"
            size="compact"
            onClick={() => navigate(`/jobs/${id}`)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Task
          </Button>
        }
      />

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Applicant Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Email Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {applicants.map((app) => (
                <tr
                  key={app.id}
                  className="hover:bg-surface-muted/50 transition-colors group"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <img
                      src={app.applicantAvatar}
                      alt=""
                      className="w-10 h-10 rounded-control bg-surface-muted border border-border object-cover"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-foreground">
                    {app.applicantName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-muted-foreground">
                    {app.applicantEmail}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ApplicationStatusLabel status={displayStatus(app.status)} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <Button
                      size="action"
                      variant="primary"
                      onClick={() => navigate(`/application/${app.id}`)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {applicants.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-16 text-center font-medium text-muted-foreground"
                  >
                    No tasker submissions detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
