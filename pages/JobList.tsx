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
import { TaskRewardText } from "../components/TaskRewardText";
import { organisationIdToString } from "../utils/organisationId";
import { getActiveOrgIdFromStorage, getOrgId } from "../utils/orgScopedRoles";
import type { RewardTypeRecord } from "../utils/rewardType";
import { CENTRAL_ORGANISATION_SLUG, ApiError } from "../services/api";
import { getPublicCentralOrganisation } from "../services/publicCentralOrg";
import { getStatusColor } from "./Dashboard";

import { Loading } from "../components/Loading";
import { Pagination } from "../components/Pagination";
import { useToast } from "../components/Toast";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";

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

  const [browseOrgLabel, setBrowseOrgLabel] = useState("Central");
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
        ...rewardCatalog.flatMap((rewardType: RewardTypeRecord) => [
          rewardType.name,
          rewardType.code,
        ]),
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
        const ao = user.activeOrganisation as { name?: string; slug?: string } | undefined;
        const name =
          typeof ao === "object" && ao && typeof ao.name === "string" && ao.name.trim()
            ? ao.name.trim()
            : "Central";
        setBrowseOrgLabel(name);
        const slug =
          typeof ao === "object" && ao && typeof ao.slug === "string" && ao.slug.trim()
            ? ao.slug.trim()
            : CENTRAL_ORGANISATION_SLUG;
        const data = await db.getTaskCategories(slug);
        setCategories(Array.isArray(data) ? data : []);
        const orgId =
          getOrgId(user.activeOrganisation) || getActiveOrgIdFromStorage();
        const rewardTypes = await db.getRewardTypesCatalog(orgId ?? undefined);
        setRewardCatalog(Array.isArray(rewardTypes) ? rewardTypes : []);
        return;
      }
      const org = await getPublicCentralOrganisation();
      setBrowseOrgLabel(org?.name?.trim() || "Central");
      const data = await db.getTaskCategories(org?.slug ?? CENTRAL_ORGANISATION_SLUG);
      setCategories(Array.isArray(data) ? data : []);
      const rewardTypes = await db.getRewardTypesCatalog(org?._id);
      setRewardCatalog(Array.isArray(rewardTypes) ? rewardTypes : []);
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

  return (
    <div className={`space-y-10 animate-fade-in pb-20 relative ${listRefreshing ? "opacity-70 pointer-events-none" : ""}`}>
      <div className="relative overflow-hidden rounded-[3rem] p-12 md:p-16 shadow-2xl transition-all duration-300 bg-primary dark:bg-zinc-900 border border-white/10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full -mr-40 -mt-40 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full -ml-20 -mb-20 blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black mb-6 text-center md:text-left text-white tracking-tighter">
            Search Tasks
          </h2>
          <p className="text-white/80 dark:text-zinc-400 text-lg md:text-xl mb-12 text-center md:text-left font-medium leading-relaxed">
            Discover tasks within{" "}
            <span className="font-bold text-white">{browseOrgLabel}</span>
            .
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-5 top-5 text-zinc-400 w-6 h-6" />
              <input
                type="text"
                placeholder="Search tasks, skills, locations..."
                className="w-full pl-14 pr-6 py-5 rounded-2xl bg-white/95 dark:bg-zinc-800 border-0 focus:ring-4 focus:ring-primary/30 outline-none shadow-2xl placeholder-zinc-400 dark:text-white font-bold transition-all text-lg"
                value={queryDraft}
                onChange={(e) => setQueryDraft(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-8 py-5 rounded-2xl font-black flex items-center justify-center transition-all shadow-2xl border-2 ${
                showFilters || hasActiveFilters
                  ? "bg-white text-primary border-white"
                  : "bg-transparent text-white border-white/20 hover:bg-white/10"
              }`}
            >
              <SlidersHorizontal className="w-5 h-5 md:mr-3" />
              <span className="hidden md:inline uppercase tracking-widest text-xs">
                Filter Browser
              </span>
              {hasActiveFilters && (
                <span className="ml-3 w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_rgba(var(--accent-800-rgb),0.8)]"></span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-8 p-8 glass-card border-white/10 rounded-3xl animate-slide-up grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 dark:text-zinc-500 uppercase tracking-widest ml-1">
                  Category
                </label>
                <select
                  className="w-full px-5 py-3 rounded-xl bg-white/90 dark:bg-zinc-900 border-0 focus:ring-2 focus:ring-[#812349] outline-none font-bold text-sm"
                  value={filterCategory}
                  onChange={(e) => updateParam("category", e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.code || category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 dark:text-zinc-500 uppercase tracking-widest ml-1">
                  Status
                </label>
                <select
                  className="w-full px-5 py-3 rounded-xl bg-white/90 dark:bg-zinc-900 border-0 focus:ring-2 focus:ring-[#812349] outline-none font-bold text-sm"
                  value={filterStatus}
                  onChange={(e) => updateParam("status", e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  {Object.values(JobStatus).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {(canArchiveFilter || canDeleteFilter) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/60 dark:text-zinc-500 uppercase tracking-widest ml-1">
                    Tasks
                  </label>
                  <select
                    className="w-full px-5 py-3 rounded-xl bg-white/90 dark:bg-zinc-900 border-0 focus:ring-2 focus:ring-[#812349] outline-none font-bold text-sm"
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
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 dark:text-zinc-500 uppercase tracking-widest ml-1">
                  Reward Type
                </label>
                <select
                  className="w-full px-5 py-3 rounded-xl bg-white/90 dark:bg-zinc-900 border-0 focus:ring-2 focus:ring-[#812349] outline-none font-bold text-sm"
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



              <div className="md:col-span-2 lg:col-span-4 space-y-2">
                <label className="text-[10px] font-black text-white/60 dark:text-zinc-500 uppercase tracking-widest ml-1">
                  Timeline
                </label>
                <div className="flex gap-3">
                  <input
                    type="date"
                    className="flex-1 px-4 py-3 rounded-xl bg-white/90 dark:bg-zinc-900 border-0 focus:ring-2 focus:ring-[#812349] font-bold text-sm"
                    value={dateFromDraft}
                    onChange={(e) => onDateFromChange(e.target.value)}
                    onBlur={commitDateFrom}
                    placeholder="From"
                  />
                  <input
                    type="date"
                    className="flex-1 px-4 py-3 rounded-xl bg-white/90 dark:bg-zinc-900 border-0 focus:ring-2 focus:ring-[#812349] font-bold text-sm"
                    value={dateToDraft}
                    onChange={(e) => onDateToChange(e.target.value)}
                    onBlur={commitDateTo}
                    placeholder="To"
                  />
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-4 pt-6 border-t border-white/10">
                <button
                  onClick={clearFilters}
                  className="flex items-center text-xs font-black text-white/60 hover:text-white uppercase tracking-widest transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-sm font-bold text-zinc-400">
          Active Board:{" "}
          <span className="text-zinc-900 dark:text-white">
            {totalItems} tasks
          </span>
        </p>
        {hasActiveFilters && (
          <div className="flex gap-2">
            {filterCategory !== "All" && (
              <span className="px-3 py-1.5 glass-card rounded-xl text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-400 flex items-center">
                {filterCategory}{" "}
                <X
                  className="w-3 h-3 ml-2 cursor-pointer"
                  onClick={() => updateParam("category", "All")}
                />
              </span>
            )}
            {filterStatus !== "All" && (
              <span className="px-3 py-1.5 glass-card rounded-xl text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-400 flex items-center">
                {filterStatus}{" "}
                <X
                  className="w-3 h-3 ml-2 cursor-pointer"
                  onClick={() => updateParam("status", "All")}
                />
              </span>
            )}
            {filterLifecycle !== "active" && (
              <span className="px-3 py-1.5 glass-card rounded-xl text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-400 flex items-center">
                {filterLifecycle}{" "}
                <X
                  className="w-3 h-3 ml-2 cursor-pointer"
                  onClick={() => updateParam("lifecycle", "")}
                />
              </span>
            )}

          </div>
        )}
      </div>

      <div className="grid gap-6">
        {jobs.map((job) => {
          const orgLabel = job.organisationName?.trim();

          return (
          <div
            key={job.id}
            onClick={() => navigate(`/jobs/${job.id}`)}
            className="glass-card rounded-[2rem] p-8 md:p-10 group cursor-pointer relative top-0 hover:-top-2 hover:shadow-2xl transition-all duration-500"
          >
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className={`px-3 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-widest border ${getStatusColor(job.status)}`}
                  >
                    {job.status}
                  </span>
                  {job.archivedAt && (
                    <span className="px-3 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-widest border bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600">
                      Archived
                    </span>
                  )}
                  {job.deletedAt && (
                    <span className="px-3 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-widest border bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800">
                      Deleted
                    </span>
                  )}
                  <span className="px-3 py-1.5 glass bg-white/20 text-zinc-600 dark:text-zinc-400 text-[10px] font-black rounded-xl uppercase tracking-widest">
                    {job.category}
                  </span>
                  {orgLabel && (
                    <span
                      title={orgLabel}
                      className="inline-flex items-center gap-1.5 max-w-[min(100%,14rem)] px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-600/80 bg-white/40 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold uppercase tracking-wide"
                    >
                      <Building2 className="w-3.5 h-3.5 shrink-0 text-primary opacity-90" aria-hidden />
                      <span className="truncate">{orgLabel}</span>
                    </span>
                  )}
                  {job.rewardType && (
                    <span className="px-3 py-1.5 bg-primary text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20">
                      <TaskRewardText
                        task={{
                          rewardType: job.rewardType,
                          rewardValue: job.rewardValue,
                          rewardText: job.rewardText,
                        }}
                        organisationId={organisationIdToString(job.organisation)}
                        catalog={rewardCatalog}
                      />
                    </span>
                  )}
                </div>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white group-hover:text-primary transition-colors mb-3 tracking-tighter">
                  {job.title}
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-base line-clamp-2 leading-relaxed font-medium max-w-4xl">
                  {job.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-8">
                  <div className="flex items-center px-4 py-2 glass rounded-2xl text-xs font-bold text-zinc-500">
                    <MapPin className="w-4 h-4 mr-2 text-primary" />{" "}
                    {job.location}
                  </div>
                  <div className="flex items-center px-4 py-2 glass rounded-2xl text-xs font-bold text-zinc-500">
                    <Clock className="w-4 h-4 mr-2 text-primary" />{" "}
                    {job.hoursRequired} Total Hrs
                  </div>
                  {job.startDate && (
                    <div className="flex items-center px-4 py-2 glass rounded-2xl text-xs font-bold text-zinc-500">
                      <Calendar className="w-4 h-4 mr-2 text-zinc-400" />{" "}
                      {job.startDate}
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden md:flex flex-col items-center justify-center pl-10 border-l border-white/20 dark:border-white/5 h-full min-h-[140px]">
                <div className="w-14 h-14 rounded-[1.25rem] bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-xl shadow-black/5">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div
              className="mt-6 pt-6 border-t border-white/20 dark:border-white/5 flex flex-wrap justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              <TaskLifecycleActions
                job={job}
                currentUser={currentUser}
                layout="compact"
                onAfterMutation={() => setListVersion((v) => v + 1)}
              />
            </div>
          </div>
          );
        })}

        {jobs.length === 0 && (
          <div className="text-center py-24 glass-card rounded-[3rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800">
            <ClipboardList className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
              No tasks found
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
              Your current filter configuration returned 0 results.
            </p>
            <button
              onClick={clearFilters}
              className="mt-10 px-8 py-3.5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primaryHover transition-all"
            >
              Clear Filters
            </button>
          </div>
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
