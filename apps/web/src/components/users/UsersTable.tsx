"use client";

import React, { useState } from "react";
import Image from "next/image";
import Badge from "@/components/ui/badge/Badge";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PencilIcon, TrashBinIcon } from "@/icons";

interface User {
  id: number;
  name: string;
  email: string;
  image: string;
  role: string;
  status: "Active" | "Inactive" | "Pending";
  joined: string;
}

const users: User[] = [
  {
    id: 1,
    name: "Lindsey Curtis",
    email: "lindsey@example.com",
    image: "/images/user/user-01.jpg",
    role: "Admin",
    status: "Active",
    joined: "Jan 12, 2024",
  },
  {
    id: 2,
    name: "Kaiya George",
    email: "kaiya@example.com",
    image: "/images/user/user-02.jpg",
    role: "Editor",
    status: "Active",
    joined: "Feb 3, 2024",
  },
  {
    id: 3,
    name: "Zain Geidt",
    email: "zain@example.com",
    image: "/images/user/user-03.jpg",
    role: "Viewer",
    status: "Pending",
    joined: "Mar 19, 2024",
  },
  {
    id: 4,
    name: "Abram Schleifer",
    email: "abram@example.com",
    image: "/images/user/user-04.jpg",
    role: "Editor",
    status: "Inactive",
    joined: "Apr 7, 2024",
  },
  {
    id: 5,
    name: "Carla George",
    email: "carla@example.com",
    image: "/images/user/user-05.jpg",
    role: "Viewer",
    status: "Active",
    joined: "May 22, 2024",
  },
  {
    id: 6,
    name: "Marcus Webb",
    email: "marcus@example.com",
    image: "/images/user/user-06.jpg",
    role: "Admin",
    status: "Active",
    joined: "Jun 1, 2024",
  },
  {
    id: 7,
    name: "Sofia Reyes",
    email: "sofia@example.com",
    image: "/images/user/user-07.jpg",
    role: "Editor",
    status: "Inactive",
    joined: "Jul 14, 2024",
  },
  {
    id: 8,
    name: "Ethan Park",
    email: "ethan@example.com",
    image: "/images/user/user-08.jpg",
    role: "Viewer",
    status: "Active",
    joined: "Aug 30, 2024",
  },
];

const statusColor: Record<User["status"], "success" | "warning" | "error"> = {
  Active: "success",
  Pending: "warning",
  Inactive: "error",
};

export default function UsersTable() {
  const t = useT();
  const { lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder={t("searchUsersPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/80 dark:placeholder-gray-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-40 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/80"
        >
          {(["All", "Admin", "Editor", "Viewer"] as const).map((r) => (
            <option key={r} value={r}>
              {t(r === "All" ? "roleAll" : r === "Admin" ? "roleAdmin" : r === "Editor" ? "roleEditor" : "roleViewer")}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                {([
                  ["colUser", t("colUser")],
                  ["colEmail", t("colEmail")],
                  ["colRole", t("colRole")],
                  ["colStatus", t("colStatus")],
                  ["colJoined", t("colJoined")],
                  ["colActions", t("colActions")],
                ] as [string, string][]).map(([key, label]) => (
                  <TableCell
                    key={key}
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                    {t("noUsersFound")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="px-5 py-4 text-start">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 overflow-hidden rounded-full">
                          <Image
                            src={user.image}
                            alt={user.name}
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {user.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                      {user.email}
                    </TableCell>

                    <TableCell className="px-5 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                      {user.role}
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      <Badge size="sm" color={statusColor[user.status]}>
                        {user.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-5 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                      {user.joined}
                    </TableCell>

                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          className="text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
                          aria-label="Edit user"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-error-500 dark:hover:text-error-400 transition-colors"
                          aria-label="Delete user"
                        >
                          <TrashBinIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {lang === "fa"
          ? `نمایش ${filtered.length} از ${users.length} کاربر`
          : `Showing ${filtered.length} of ${users.length} users`}
      </p>
    </div>
  );
}