import { AdminPostGrid } from '@/components/admin/AdminPostGrid';
import { getAllPosts } from '@/actions/admin-actions';

export default async function PostsPage() {
    const posts = await getAllPosts();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Post Moderation</h1>
            </div>
            <AdminPostGrid posts={posts} />
        </div>
    );
}
