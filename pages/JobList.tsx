import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  Clock,
  ArrowRight,
  Calendar,
  SlidersHorizontal,
  X,
  RotateCcw,
  ClipboardList,
  Building2,
} from "lucide-react";
import { JobStatus, Job, Permission, User } from "../types";
import { db } from "../services/database";
import { resolveTaskCategoryLabel } from "../utils/taskCategoryDisplay";
import { TaskRewardText } from "../components/TaskRewardText";
import { organisationIdToString } from "../utils/organisationId";
import { getActiveOrgIdFromStorage, getOrgId } from "../utils/orgScopedRoles";
import type { RewardTypeRecord } from "../utils/rewardType";
import { ApiError } from "../services/api";
import {
  getPublicCentralOrganisation,
  resolveCatalogOrganisationId,
} from "../services/platformOrganisations";
import { APPLICATION_WINDOW_NOT_YET_OPEN_FILTER } from "../utils/applicationWindow";

import { Loading } from "../components/Loading";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { JobStatusLabel } from "@/utils/statusDisplay";
import { Pagination } from "../components/Pagination";
import { useToast } from "../components/Toast";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";
import {
  formatOptionalTaskDuration,
  formatOptionalTaskLocation,
} from "../utils/formatOptionalTaskField";
import {
  formatTaskDate,
  formatTaskDateOrNA,
} from "../utils/formatTaskDate";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 400;
/** Native date input uses yyyy-mm-dd; only sync to URL when complete or cleared. */
const FULL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const JobList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError } = useToast();

  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [queryDraft, setQueryDraft] = useState(() => searchParams.get("q") || "");
  const [dateFromDraft, setDateFromDraft] = useState(() => searchParams.get("dateFrom") || "");
  const [dateToDraft, setDateToDraft] = useState(() => searchParams.get("dateTo") || "");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Data State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Array<{ name: string; code?: string }>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const initialFetchDone = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [browseOrgLabel, setBrowseOrgLabel] = useState("Tasker");
  const [rewardCatalog, setRewardCatalog] = useState<RewardTypeRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [listVersion, setListVersion] = useState(0);

  useEffect(() => {
    void db.getCurrentUser().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  // Derived Filter State from URL
  const searchTerm = searchParams.get("q") || "";
  const filterCategory = searchParams.get("category") || "All";
  const filterStatus = searchParams.get("status") || "All";
  const filterReward = searchParams.get("reward") || "All";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const rawLifecycle = (searchParams.get("lifecycle") || "").toLowerCase();
  const canArchiveFilter =
    !!currentUser?.isSuperAdmin ||
    !!currentUser?.permissions?.includes(Permission.TASK_ARCHIVE);
  const canDeleteFilter =
    !!currentUser?.isSuperAdmin ||
    !!currentUser?.permissions?.includes(Permission.TASK_DELETE);
  const filterLifecycle =
    rawLifecycle === "archived" && canArchiveFilter
      ? "archived"
      : rawLifecycle === "deleted" && canDeleteFilter
        ? "deleted"
        : "active";

  /** Last `q` we pushed or adopted from the URL — avoids clobbering `queryDraft` after debounced commits. */
  const lastCommittedQueryRef = useRef(searchTerm);

  // Adopt `q` from the URL when it changes without our debounced commit (back/forward, shared link, reset).
  useEffect(() => {
    if (searchTerm === lastCommittedQueryRef.current) return;
    setQueryDraft(searchTerm);
    lastCommittedQueryRef.current = searchTerm;
  }, [searchTerm]);

  useEffect(() => {
    setDateFromDraft(dateFrom);
  }, [dateFrom]);

  useEffect(() => {
    setDateToDraft(dateTo);
  }, [dateTo]);

  // Filter Updates
  const updateParam = useCallback(
    (key: string, value: string, opts?: { resetPage?: boolean }) => {
      const resetPage = opts?.resetPage !== false;
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (value && value !== "All") {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
        if (resetPage) {
          newParams.set("page", "1");
        }
        return newParams;
      }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!currentUser) return;
    if (
      (rawLifecycle === "archived" && !canArchiveFilter) ||
      (rawLifecycle === "deleted" && !canDeleteFilter)
    ) {
      updateParam("lifecycle", "");
    }
  }, [currentUser, rawLifecycle, canArchiveFilter, canDeleteFilter, updateParam]);

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      searchDebounceRef.current = null;
      if (queryDraft === searchTerm) return;
      lastCommittedQueryRef.current = queryDraft;
      updateParam("q", queryDraft);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [queryDraft, searchTerm, updateParam]);

  const commitDateFrom = () => {
    if (dateFromDraft === dateFrom) return;
    if (dateFromDraft === "" || FULL_DATE_RE.test(dateFromDraft)) {
      updateParam("dateFrom", dateFromDraft);
    }
  };

  const commitDateTo = () => {
    if (dateToDraft === dateTo) return;
    if (dateToDraft === "" || FULL_DATE_RE.test(dateToDraft)) {
      updateParam("dateTo", dateToDraft);
    }
  };

  const onDateFromChange = (value: string) => {
    setDateFromDraft(value);
    if (value === "" || FULL_DATE_RE.test(value)) {
      updateParam("dateFrom", value);
    }
  };

  const onDateToChange = (value: string) => {
    setDateToDraft(value);
    if (value === "" || FULL_DATE_RE.test(value)) {
      updateParam("dateTo", value);
    }
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
    setCurrentPage(1);
    setQueryDraft("");
    setDateFromDraft("");
    setDateToDraft("");
    lastCommittedQueryRef.current = "";
  };

  const hasActiveFilters =
    filterCategory !== "All" ||
    filterStatus !== "All" ||
    filterReward !== "All" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    filterLifecycle !== "active";

  const rewardTypeOptions = Array.from(
    new Set(
      [
        ...rewardCatalog
          .filter((rt: RewardTypeRecord) => rt.isActive !== false)
          .map((rewardType: RewardTypeRecord) => rewardType.name),
        ...jobs.map((job: Job) => job.rewardType),
      ]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );

  useEffect(() => {
    const fetchJobs = async () => {
      if (!initialFetchDone.current) {
        setLoading(true);
      } else {
        setListRefreshing(true);
      }
      const filters: any = {
        search: searchTerm,
      };
      if (filterCategory !== "All") filters.category = filterCategory;
      if (filterStatus !== "All") filters.status = filterStatus;
      if (filterReward !== "All") filters.reward = filterReward;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (filterLifecycle !== "active") filters.lifecycle = filterLifecycle;

      const page = parseInt(searchParams.get("page") || "1");
      setCurrentPage(page);

      try {
        const data = await db.getSearchJobsPaged(filters, page, PAGE_SIZE);

        setJobs(data.jobs);
        setTotalItems(data.pagination.total);
        setTotalPages(data.pagination.pages);
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 403) {
          showError(err.message || "You cannot view tasks in this list.");
          updateParam("lifecycle", "");
        } else {
          console.error(err);
          showError(err?.message || "Failed to load tasks.");
        }
        setJobs([]);
        setTotalItems(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
        setListRefreshing(false);
        initialFetchDone.current = true;
      }
    };
    void fetchJobs();
  }, [
    searchTerm,
    filterCategory,
    filterStatus,
    filterReward,
    filterLifecycle,
    dateFrom,
    dateTo,
    searchParams.get("page"),
    showError,
    updateParam,
    listVersion,
  ]);

  useEffect(() => {
    const loadBrowseContext = async () => {
      const user = await db.getCurrentUser();
      if (user) {
        const ao = user.activeOrganisation as { name?: string } | undefined;
        const name =
          typeof ao === "object" && ao && typeof ao.name === "string" && ao.name.trim()
            ? ao.name.trim()
            : "Tasker";
        setBrowseOrgLabel(name);
        const orgId =
          (await resolveCatalogOrganisationId(user.activeOrganisation)) ||
          getOrgId(user.activeOrganisation) ||
          getActiveOrgIdFromStorage() ||
          undefined;
        if (orgId) {
          const data = await db.getTaskCategories(orgId);
          setCategories(Array.isArray(data) ? data : []);
          const rewardTypes = await db.getRewardTypesCatalog(orgId);
          setRewardCatalog(Array.isArray(rewardTypes) ? rewardTypes : []);
        }
        return;
      }
      const org = await getPublicCentralOrganisation();
      setBrowseOrgLabel(org?.name?.trim() || "Tasker");
      if (org?._id) {
        const data = await db.getTaskCategories(org._id);
        setCategories(Array.isArray(data) ? data : []);
        const rewardTypes = await db.getRewardTypesCatalog(org._id);
        setRewardCatalog(Array.isArray(rewardTypes) ? rewardTypes : []);
      }
    };
    void loadBrowseContext();
  }, []);

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(page));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return <Loading message="Fetching tasks..." />;
  }

  const filterSelectClass =
    "h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

  return (
    <div className={`space-y-6 animate-fade-in pb-12 relative min-w-0 ${listRefreshing ? "opacity-70 pointer-events-none" : ""}`}>
      <PageHeader
        title="Search Tasks"
        description={`Discover tasks within ${browseOrgLabel}.`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search tasks, skills, locations..."
            value={queryDraft}
            onChange={(e) => setQueryDraft(e.target.value)}
          />
        </div>
        <Button
          variant={showFilters || hasActiveFilters ? "primary" : "secondary"}
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasActiveFilters ? (
            <span className="ml-1 h-2 w-2 rounded-full bg-white/90" aria-hidden />
          ) : null}
        </Button>
      </div>

      {showFilters && (
        <Card className="animate-slide-up grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  className={filterSelectClass}
                  value={filterCategory}
                  onChange={(e) => updateParam("category", e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {categories
                    .filter((category) => category?.isActive !== false)
                    .map((category) => (
                      <option
                        key={String(category._id ?? category.code ?? category.name)}
                        value={String(category._id)}
                      >
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  className={filterSelectClass}
                  value={filterStatus}
                  onChange={(e) => {
                    const val = e.target.value;
                    const clearsTimeline =
                      val === APPLICATION_WINDOW_NOT_YET_OPEN_FILTER ||
                      val === JobStatus.CLOSED;
                    if (clearsTimeline) {
                      setSearchParams((prev) => {
                        const newParams = new URLSearchParams(prev);
                        if (val && val !== "All") newParams.set("status", val);
                        else newParams.delete("status");
                        newParams.delete("dateFrom");
                        newParams.delete("dateTo");
                        newParams.set("page", "1");
                        return newParams;
                      }, { replace: true });
                      setDateFromDraft("");
                      setDateToDraft("");
                      return;
                    }
                    updateParam("status", val);
                  }}
                >
                  <option value="All">All Statuses</option>
                  {Object.values(JobStatus).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value={APPLICATION_WINDOW_NOT_YET_OPEN_FILTER}>
                    Not Yet Open
                  </option>
                </select>
              </div>
              {(canArchiveFilter || canDeleteFilter) && (
                <div className="space-y-1.5">
                  <Label>Tasks</Label>
                  <select
                    className={filterSelectClass}
                    value={filterLifecycle}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateParam("lifecycle", v === "active" ? "" : v);
                    }}
                  >
                    <option value="active">Active</option>
                    {canArchiveFilter && <option value="archived">Archived</option>}
                    {canDeleteFilter && <option value="deleted">Deleted</option>}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Reward type</Label>
                <select
                  className={filterSelectClass}
                  value={filterReward}
                  onChange={(e) => updateParam("reward", e.target.value)}
                >
                  <option value="All">Any Reward</option>
                  {rewardTypeOptions.map((rewardType) => (
                    <option key={rewardType} value={rewardType}>
                      {rewardType}
                    </option>
                  ))}
                </select>
              </div>



              <div className="md:col-span-2 lg:col-span-4 space-y-1.5">
                <Label>Timeline</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    className="flex-1"
                    value={dateFromDraft}
                    onChange={(e) => onDateFromChange(e.target.value)}
                    onBlur={commitDateFrom}
                  />
                  <Input
                    type="date"
                    className="flex-1"
                    value={dateToDraft}
                    onChange={(e) => onDateToChange(e.target.value)}
                    onBlur={commitDateTo}
                  />
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-5 flex justify-end border-t border-border pt-3">
                <Button variant="ghost" size="compact" onClick={clearFilters}>
                  <RotateCcw className="h-4 w-4" />
                  Reset filters
                </Button>
              </div>
        </Card>
      )}

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{totalItems}</span> tasks
        </p>
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filterCategory !== "All" && (
              <Badge variant="chip" className="gap-1">
                {filterCategory}
                <button type="button" aria-label="Clear category filter" onClick={() => updateParam("category", "All")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterStatus !== "All" && (
              <Badge variant="chip" className="gap-1">
                {filterStatus === APPLICATION_WINDOW_NOT_YET_OPEN_FILTER
                  ? "Not Yet Open"
                  : filterStatus}
                <button type="button" aria-label="Clear status filter" onClick={() => updateParam("status", "All")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterLifecycle !== "active" && (
              <Badge variant="chip" className="gap-1">
                {filterLifecycle}
                <button type="button" aria-label="Clear lifecycle filter" onClick={() => updateParam("lifecycle", "")}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => {
          const orgLabel = job.organisationName?.trim();

          return (
          <Card
            key={job.id}
            padding="card"
            onClick={() => navigate(`/jobs/${job.id}`)}
            className="group cursor-pointer transition-colors hover:border-primary/30"
          >
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <JobStatusLabel status={job.status} />
                  {job.archivedAt && (
                    <Badge variant="chipMuted">Archived</Badge>
                  )}
                  {job.deletedAt && (
                    <Badge variant="chip" className="border-red-200 text-red-700 dark:border-red-800 dark:text-red-300">
                      Deleted
                    </Badge>
                  )}
                  <Badge variant="chip">{resolveTaskCategoryLabel(job)}</Badge>
                  {orgLabel && (
                    <Badge
                      variant="chip"
                      title={orgLabel}
                      className="max-w-[14rem] gap-1"
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                      <span className="truncate">{orgLabel}</span>
                    </Badge>
                  )}
                  <Badge variant="chipPrimary">
                    <TaskRewardText
                      task={{
                        rewardType: job.rewardType,
                        rewardValue: job.rewardValue,
                        rewardText: job.rewardText,
                      }}
                      organisationId={organisationIdToString(job.organisation)}
                      catalog={rewardCatalog}
                    />
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div onClick={(e) => e.stopPropagation()}>
                    <TaskLifecycleActions
                      job={job}
                      currentUser={currentUser}
                      layout="compact"
                      onAfterMutation={() => setListVersion((v) => v + 1)}
                    />
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-control bg-surface-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                {job.title}
              </h3>
              <p className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                {job.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-muted px-2.5 py-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {formatOptionalTaskLocation(job.location)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-muted px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {formatOptionalTaskDuration(job.hoursRequired, "totalHrs")}
                </span>
                {job.applicationCloseDate ? (
                  <span className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-muted px-2.5 py-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Applications close:{" "}
                    {formatTaskDateOrNA(job.applicationCloseDate)}
                  </span>
                ) : null}
                {job.startDate && (
                  <span className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-muted px-2.5 py-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Starts: {formatTaskDate(job.startDate)}
                  </span>
                )}
              </div>
            </div>
          </Card>
          );
        })}

        {jobs.length === 0 && (
          <Card className="border-dashed py-12 text-center">
            <ClipboardList className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-foreground">No tasks found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your current filter configuration returned 0 results.
            </p>
            <Button className="mt-6" size="compact" onClick={clearFilters}>
              Clear filters
            </Button>
          </Card>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={PAGE_SIZE}
        onPageChange={handlePageChange}
        label="tasks"
      />
    </div>
  );
};
