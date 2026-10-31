import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Skeleton } from '../components/ui/LoadingIndicator';
import { userService } from '../services/userService';
import { useAuth } from '../hooks/useAuth';
import { formatDate, getRoleBadgeConfig } from '../utils/formatters';
import CreateStaffModal from '../components/users/CreateStaffModal';
import UserProfileModal from '../components/users/UserProfileModal';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export default function UsersPage() {
  const { role: currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const reloadUsers = useCallback(() => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;
    userService
      .listUsers({
        page,
        pageSize,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        search: searchTerm || undefined,
      })
      .then((response) => {
        if (isMounted) {
          setUsers(response.items || []);
          setTotal(response.total || 0);
          setTotalPages(response.pages || 1);
          setIsLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[Brightloop UsersPage] Error loading users:', err);
          setError(err.message || 'Unable to load user records from backend.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, roleFilter, searchTerm, refreshTrigger]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        title={isAdmin ? 'User Management & Directory' : 'Customer Directory'}
        description={
          isAdmin
            ? 'Manage all platform accounts, oversee customer profiles, and provision operational staff identities.'
            : 'Operational directory of customer profiles, contacts, and account assignments.'
        }
        breadcrumbs={[
          { label: 'Brightloop', href: '/' },
          { label: isAdmin ? 'Users' : 'Customers' },
        ]}
        actions={
          isAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsStaffModalOpen(true)}
              className="shadow-2xs"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Provision Staff Account
            </Button>
          )
        }
      />

      {/* Directory Table Card */}
      <Card>
        <CardHeader className="border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-base font-bold text-slate-900">
              {isAdmin ? 'Platform Directory' : 'Customer Profiles'} ({total})
            </CardTitle>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, email, company..."
                className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Role Filter (Admin Only) */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer py-1"
                >
                  <option value="all">All Roles</option>
                  <option value="customer">Customers</option>
                  <option value="staff">Staff Members</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-rose-900">{error}</p>
              <Button variant="outline" size="sm" onClick={reloadUsers}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Try Again
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-800">No Users Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm || roleFilter !== 'all'
                  ? 'No accounts match your search query or filter selection.'
                  : 'No users have registered or been provisioned yet.'}
              </p>
              {(searchTerm || roleFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchInput('');
                    setSearchTerm('');
                    setRoleFilter('all');
                  }}
                  className="mt-2 text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User / Identity</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const roleConfig = getRoleBadgeConfig(u.role);
                  return (
                    <TableRow key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                            {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {u.full_name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${roleConfig.className}`}
                        >
                          {roleConfig.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {u.company_name || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {u.phone_number || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'success' : 'danger'} size="sm">
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(u.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(u)}
                          className="text-xs text-slate-600 hover:text-indigo-600"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {!isLoading && !error && users.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Showing page {page} of {totalPages} ({total} total records)</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50 text-slate-700 cursor-pointer"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  className="text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin-Only Staff Creation Modal */}
      {isAdmin && (
        <CreateStaffModal
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          onSuccess={reloadUsers}
        />
      )}

      {/* User Profile Details Modal */}
      <UserProfileModal
        user={selectedUser}
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}
