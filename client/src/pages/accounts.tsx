import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from "@/components/ui/pagination";
import { Filter, Loader2, Plus, Search, Pencil, Trash2, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "@/hooks/use-debounce";

type UserAccount = {
    id: number;
    username: string;
    email?: string;
    role: "admin" | "manager" | "employee";
    employeeId?: number;
    fullName: string;
    createdAt: string;
};

export default function AccountsPage() {
    const [, navigate] = useLocation();
    const { t } = useTranslation();
    const { toast } = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Estado para paginação e filtragem
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [accountToDelete, setAccountToDelete] = useState<number | null>(null);

    // Adicionar debounce para pesquisa
    const debouncedSearchQuery = useDebounce(searchTerm, 300);

    // Ensure only admins can access this page
    if (user?.role !== "admin") {
        navigate("/");
        return null;
    }

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearchQuery, roleFilter, limit]);

    // Simulating server-side pagination (ideally this would be handled by the API)
    const { data, isLoading, error } = useQuery<{ accounts: UserAccount[], total: number }>({
        queryKey: ["/api/users", page, limit, debouncedSearchQuery, roleFilter],
        queryFn: async () => {
            try {
                const res = await fetch("/api/users");

                if (!res.ok) {
                    console.error(`API Error: ${res.status} ${res.statusText}`);
                    const errorText = await res.text();
                    console.error("Error response:", errorText);
                    throw new Error(`Failed to fetch accounts (${res.status})`);
                }

                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    console.error(`Expected JSON but got ${contentType}`);
                    throw new Error("Server returned non-JSON response");
                }

                // TODO: In a real implementation, the API would handle pagination and filtering
                const allAccounts = await res.json();

                // Handle different API response formats
                let accountsArray = [];
                if (Array.isArray(allAccounts)) {
                    // Direct array response
                    accountsArray = allAccounts;
                } else if (allAccounts && typeof allAccounts === 'object') {
                    // Object response with users property
                    if (Array.isArray(allAccounts.users)) {
                        accountsArray = allAccounts.users;
                    } else if (Array.isArray(allAccounts.accounts)) {
                        accountsArray = allAccounts.accounts;
                    } else if (Array.isArray(allAccounts.data)) {
                        accountsArray = allAccounts.data;
                    } else {
                        console.error("API response object doesn't contain expected arrays:", allAccounts);
                        throw new Error("Invalid API response format");
                    }
                } else {
                    console.error("API response is not an array or object:", allAccounts);
                    throw new Error("Invalid API response format");
                }

                // Filter accounts based on search term and role
                const filteredAccounts = accountsArray.filter((account: UserAccount) => {
                    const matchesSearch =
                        !debouncedSearchQuery ||
                        account.username.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                        account.fullName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                        (account.email && account.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));

                    const matchesRole = roleFilter === "all" || account.role === roleFilter;

                    return matchesSearch && matchesRole;
                });

                // Apply pagination
                const paginatedAccounts = filteredAccounts.slice(
                    (page - 1) * limit,
                    page * limit
                );

                return {
                    accounts: paginatedAccounts,
                    total: filteredAccounts.length
                };
            } catch (err) {
                console.error("Fetch accounts error:", err);
                throw err instanceof Error ? err : new Error("Unknown error fetching accounts");
            }
        },
    });

    const deleteAccountMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/users/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete account");
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: t("common.success"),
                description: t("Account deleted successfully"),
            });
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            setAccountToDelete(null);
        },
        onError: (err) => {
            toast({
                title: t("common.error"),
                description: err.message,
                variant: "destructive",
            });
        },
    });

    const handleDeleteAccount = (id: number) => {
        setAccountToDelete(id);
    };

    const confirmDeleteAccount = () => {
        if (accountToDelete) {
            deleteAccountMutation.mutate(accountToDelete);
        }
    };

    const accounts = data?.accounts || [];
    const totalCount = data?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const handleSearch = (query: string) => {
        setSearchTerm(query);
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "admin":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {t("accounts.admin")}
                    </span>
                );
            case "manager":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {t("accounts.manager")}
                    </span>
                );
            case "employee":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {t("accounts.employee")}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {role || "Unknown"}
                    </span>
                );
        }
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <Header
                title=""
                onSearch={handleSearch}
                showSearch={true}
                searchPlaceholder={t('accounts.search')}
            />

            <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <h1 className="text-2xl font-bold">{t('common.accounts')}</h1>

                    <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
                        <div className="w-48">
                            <Select
                                value={roleFilter || "all"}
                                onValueChange={setRoleFilter}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("accounts.filterByRole")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("accounts.allRoles")}</SelectItem>
                                    <SelectItem value="admin">{t("accounts.admin")}</SelectItem>
                                    <SelectItem value="manager">{t("accounts.manager")}</SelectItem>
                                    <SelectItem value="employee">{t("accounts.employee")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button asChild>
                            <Link href="/accounts/new">
                                <Plus className="mr-2 h-4 w-4" />
                                {t("accounts.newAccount")}
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-6">
                        {isLoading ? (
                            <div className="flex justify-center items-center min-h-[400px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center text-center h-[400px] bg-muted/20 rounded-lg">
                                <h3 className="text-xl font-medium mb-2">Error loading accounts</h3>
                                <p className="text-muted-foreground mb-4">{error.message}</p>
                            </div>
                        ) : accounts.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t("accounts.fullName")}</TableHead>
                                                <TableHead>{t("accounts.username")}</TableHead>
                                                <TableHead>{t("accounts.role")}</TableHead>
                                                <TableHead>{t("accounts.createdAt")}</TableHead>
                                                <TableHead className="text-right">{t("common.actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {accounts.map((account) => (
                                                <TableRow key={account.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                <User className="h-4 w-4 text-primary" />
                                                            </div>
                                                            <span className="font-medium">{account.fullName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{account.username}</TableCell>
                                                    <TableCell>{getRoleBadge(account.role)}</TableCell>
                                                    <TableCell>
                                                        {new Date(account.createdAt).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" asChild>
                                                                <Link href={`/accounts/${account.id}/edit`}>
                                                                    <Pencil className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                            <AlertDialog open={accountToDelete === account.id} onOpenChange={(open) => !open && setAccountToDelete(null)}>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        disabled={account.id === user?.id}
                                                                        onClick={() => handleDeleteAccount(account.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>
                                                                            {t("accounts.confirmDelete")}
                                                                        </AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            {t("accounts.deleteWarning")}
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>
                                                                            {t("common.cancel")}
                                                                        </AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={confirmDeleteAccount}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        >
                                                                            {t("common.delete")}
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {totalPages > 1 && (
                                    <Pagination className="mt-6">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                                    disabled={page === 1}
                                                >
                                                    {t('common.back')}
                                                </Button>
                                            </PaginationItem>

                                            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                                // Show pages around current page for large number of pages
                                                let pageToShow = i + 1;
                                                if (totalPages > 5) {
                                                    if (page > 3 && page <= totalPages - 2) {
                                                        pageToShow = page - 2 + i;
                                                    } else if (page > totalPages - 2) {
                                                        pageToShow = totalPages - 4 + i;
                                                    }
                                                }

                                                return (
                                                    <PaginationItem key={i}>
                                                        <Button
                                                            variant={page === pageToShow ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => setPage(pageToShow)}
                                                        >
                                                            {pageToShow}
                                                        </Button>
                                                    </PaginationItem>
                                                );
                                            })}

                                            <PaginationItem>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={page === totalPages}
                                                >
                                                    {t('common.next')}
                                                </Button>
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                )}

                                <div className="flex justify-end mt-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">{t('common.rowsPerPage')}:</span>
                                        <Select
                                            value={limit ? limit.toString() : "10"}
                                            onValueChange={(value) => setLimit(Number(value) || 10)}
                                        >
                                            <SelectTrigger className="w-[80px]">
                                                <SelectValue placeholder="10" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5</SelectItem>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="15">15</SelectItem>
                                                <SelectItem value="20">20</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <span className="text-sm text-muted-foreground">
                                            {t('common.showing')} {Math.min((page - 1) * limit + 1, totalCount)} - {Math.min(page * limit, totalCount)} {t('common.of')} {totalCount}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center h-[400px] bg-muted/20 rounded-lg">
                                <User className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-medium mb-2">{t('accounts.noAccounts')}</h3>
                                <p className="text-muted-foreground mb-4">
                                    {debouncedSearchQuery || roleFilter !== "all"
                                        ? "Try adjusting your filters or search query"
                                        : "Get started by creating your first account"}
                                </p>
                                <Button asChild>
                                    <Link href="/accounts/new">
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t("accounts.newAccount")}
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
} 