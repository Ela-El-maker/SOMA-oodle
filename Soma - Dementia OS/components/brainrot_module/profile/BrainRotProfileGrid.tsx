import React from "react";
import { SocialPost } from "../../../types";
import { IoPlay, IoHeart } from "react-icons/io5";

interface BrainRotProfileGridProps {
    posts: SocialPost[];
    onPostClick: (post: SocialPost) => void;
}

export default function BrainRotProfileGrid({ posts, onPostClick }: BrainRotProfileGridProps) {
    return (
        <div className="grid grid-cols-3 gap-0.5 md:gap-1 p-0.5 md:p-1 bg-white dark:bg-black min-h-[50vh]">
            {posts.map(post => (
                <div
                    key={post.id}
                    className="aspect-[3/4] bg-zinc-200 dark:bg-zinc-800 relative cursor-pointer group overflow-hidden"
                    onClick={() => onPostClick(post)}
                >
                    {/* Media Thumbnail */}
                    <img
                        src={post.mediaUrl}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        loading="lazy"
                    />

                    {/* Views Count Overlay */}
                    <div className="absolute bottom-1 left-1 flex items-center text-white drop-shadow-md">
                        <IoPlay className="w-4 h-4 mr-0.5" />
                        <span className="text-xs font-bold">{post.comments * 105}</span> {/* Mock views count */}
                    </div>
                </div>
            ))}
            {posts.length === 0 && (
                <div className="col-span-3 flex flex-col items-center justify-center py-20 text-zinc-400">
                    <p>No posts yet</p>
                </div>
            )}
        </div>
    );
}



