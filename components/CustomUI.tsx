import React, { useState, useRef } from "react";
import {
  ChevronDown,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input, inputVariants } from "@/components/ui/input";
import { fieldErrorClass } from "@/components/ui/field";
import { cn } from "@/utils/cn";
import {
  FloatingMenuPortal,
  useFloatingMenuClickOutside,
} from "./FloatingMenuPortal";

export interface Option {
  name: string;
  code?: string;
  icon?: string;
  id?: string;
  description?: string;
}

interface CustomDropdownProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: "default" | "outline" | "ghost" | "compact";
  icon?: React.ReactNode;
  error?: boolean;
  disabled?: boolean;
  /** When `"id"`, value/onChange use `option.id` (falls back to name). */
  valueKey?: "name" | "id";
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  variant = "default",
  icon,
  error,
  disabled = false,
  valueKey = "name",
}) => {
  const optionValue = (opt: Option) =>
    valueKey === "id" && opt.id !== undefined ? opt.id : opt.name;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useFloatingMenuClickOutside(isOpen, () => setIsOpen(false), anchorRef, menuRef);

  const selectedOption = options.find((opt) => optionValue(opt) === value);
  const matchesSearch = (opt: Option) => {
    const term = searchTerm.toLowerCase();
    if (opt.name.toLowerCase().includes(term)) return true;
    return (opt.description ?? "").toLowerCase().includes(term);
  };
  const filteredOptions = options.filter(matchesSearch);
  const optionKey = (opt: Option) => opt.id ?? opt.code ?? opt.name;

  const getButtonStyles = () => {
    switch (variant) {
      case "outline":
        return cn(
          "h-9 px-3 border rounded-control text-sm font-medium",
          error ? "border-red-500" : "border-border",
        );
      case "ghost":
        return cn(
          "h-9 px-2 text-sm font-semibold",
          error ? "text-red-500" : "text-primary",
          "hover:underline",
        );
      case "compact":
        return cn(
          "w-full h-10 px-3 border rounded-control text-sm font-medium bg-surface-muted text-foreground focus:bg-surface",
          error ? "border-red-500 ring-1 ring-red-500" : "border-border",
        );
      default:
        return cn(
          inputVariants({ size: "default" }),
          "flex items-center justify-between text-left font-medium",
          fieldErrorClass(error),
        );
    }
  };

  return (
    <div
      className={`${variant === "default" && label ? "space-y-2" : ""} relative`}
      ref={anchorRef}
    >
      {label && <Label className="ml-1">{label}</Label>}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen(!isOpen);
        }}
        className={cn(
          getButtonStyles(),
          "flex items-center justify-between transition-colors",
          disabled
            ? "opacity-60 cursor-not-allowed"
            : "hover:bg-surface-muted",
        )}
      >
        <span className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {selectedOption?.icon && <span>{selectedOption.icon}</span>}
          {selectedOption ? (
            selectedOption.name
          ) : (
            <span className="text-zinc-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""} ${variant === "ghost" ? "ml-1" : "ml-2"}`}
        />
      </button>

      <FloatingMenuPortal
        isOpen={isOpen}
        anchorRef={buttonRef}
        menuRef={menuRef}
        recalculateDeps={[searchTerm, filteredOptions.length]}
        className="flex flex-col min-w-[200px] glass-overlay rounded-surface overflow-hidden animate-slide-up shadow-lg"
      >
        {options.length > 10 && (
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                type="text"
                size="compact"
                className="pl-9 text-xs"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}
        <div className="max-h-60 overflow-y-auto p-2 space-y-1 min-h-0">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={optionKey(opt)}
                type="button"
                onClick={() => {
                  onChange(optionValue(opt));
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className={`w-full p-2.5 rounded-control flex items-center justify-between text-left text-sm transition-all ${
                  value === optionValue(opt)
                    ? "bg-primary text-white"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {opt.icon && <span>{opt.icon}</span>}
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold truncate">
                      {opt.name}
                    </span>
                    {opt.description && (
                      <span
                        className={`block text-[10px] font-semibold truncate mt-0.5 ${
                          value === optionValue(opt)
                            ? "text-white/80"
                            : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {opt.description}
                      </span>
                    )}
                  </span>
                </span>
                {value === optionValue(opt) && (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-zinc-500 font-semibold">
              No results found
            </div>
          )}
        </div>
      </FloatingMenuPortal>
    </div>
  );
};

interface CustomDatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  error?: boolean;
  clearable?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  label,
  value,
  onChange,
  min,
  error,
  clearable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(value || new Date()));
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelText = label.replace(/\s*\*$/, "");
  const placeholderText = /date$/i.test(labelText)
    ? `Select ${labelText}`
    : `Select ${labelText} Date`;

  useFloatingMenuClickOutside(isOpen, () => setIsOpen(false), anchorRef, menuRef);

  const dateMenuWidth =
    isOpen &&
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 640px)").matches
      ? Math.max(buttonRef.current?.getBoundingClientRect().width ?? 0, 320)
      : undefined;

  const daysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const offset = selected.getTimezoneOffset() * 60000;
    const localISODate = new Date(selected.getTime() - offset)
      .toISOString()
      .split("T")[0];
    onChange(localISODate);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = daysInMonth(year, month);
    const startDay = startDayOfMonth(year, month);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDate = min ? new Date(min) : null;
    if (minDate) minDate.setHours(0, 0, 0, 0);

    const calendarCells = [];
    for (let i = 0; i < startDay; i++) {
      calendarCells.push(<div key={`empty-${i}`} className="h-10" />);
    }

    for (let day = 1; day <= days; day++) {
      const current = new Date(year, month, day);
      const isSelected =
        value ===
        new Date(current.getTime() - current.getTimezoneOffset() * 60000)
          .toISOString()
          .split("T")[0];
      const isToday = today.getTime() === current.getTime();
      const isDisabled = minDate && current < minDate;

      calendarCells.push(
        <button
          key={day}
          type="button"
          disabled={isDisabled}
          onClick={() => handleSelectDate(day)}
          className={`h-10 w-full rounded-control text-sm font-medium transition-all ${
            isSelected
              ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
              : isDisabled
                ? "text-zinc-200 dark:text-zinc-700 cursor-not-allowed"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
          } ${isToday && !isSelected ? "text-primary border border-primary/20" : ""}`}
        >
          {day}
        </button>,
      );
    }

    return calendarCells;
  };

  return (
    <div className="space-y-2 relative" ref={anchorRef}>
      <Label className="ml-1">{label}</Label>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          inputVariants({ size: "default" }),
          "flex items-center justify-between text-left font-medium transition-colors hover:bg-surface-muted group",
          fieldErrorClass(error),
        )}
      >
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          <span>
            {value ? (
              new Date(value).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            ) : (
              <span className="text-zinc-400">{placeholderText}</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {clearable && value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label={`Clear ${labelText}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <FloatingMenuPortal
        isOpen={isOpen}
        anchorRef={buttonRef}
        menuRef={menuRef}
        menuWidth={dateMenuWidth}
        maxMenuHeight={420}
        recalculateDeps={[viewDate.getMonth(), viewDate.getFullYear()]}
        className="glass-overlay rounded-surface p-card animate-slide-up shadow-lg"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h4 className="font-semibold tracking-tight text-zinc-900 dark:text-white">
            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
          </h4>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <div
              key={d}
              className="text-[10px] font-semibold text-zinc-400 uppercase"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
        {clearable && value && (
          <button
            type="button"
            onClick={handleClear}
            className="mt-4 w-full h-9 text-xs font-semibold uppercase tracking-widest text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-control transition-colors"
          >
            Clear date
          </button>
        )}
      </FloatingMenuPortal>
    </div>
  );
};
