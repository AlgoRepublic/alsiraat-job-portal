import { ApplicationStatusLabel } from "@/utils/statusDisplay";

interface StatusBadgeProps {
  status: "Pending" | "Reviewing" | "Shortlisted" | "Approved" | "Rejected";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = "",
}) => <ApplicationStatusLabel status={status} className={className} />;
