import { AdminUserTable } from '@/components/admin/AdminUserTable';
import { getAllUsers } from '@/actions/admin-actions';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const users = await getAllUsers();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            </div>
            <AdminUserTable users={users} />
        </div>
    );
}
