import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  label?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  label = "items",
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 px-2">
      <p className="text-sm text-muted-foreground font-medium">
        Showing{" "}
        <span className="font-semibold text-foreground">
          {startItem}–{endItem}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-foreground">
          {totalItems}
        </span>{" "}
        {label}
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="iconCompact"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First page"
        >
          <ChevronsLeft className="w-5 h-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="iconCompact"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          title="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-1 mx-2">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "h-10 w-10 rounded-control text-sm font-semibold transition-all",
                  pageNum === currentPage
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="iconCompact"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          title="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="iconCompact"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Last page"
        >
          <ChevronsRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
