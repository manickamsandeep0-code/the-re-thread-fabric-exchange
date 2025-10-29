
import React, { useState, useEffect } from 'react';
import type { GalleryPost } from '../types';
import { getGalleryPosts } from '../services/firebaseService';
import Spinner from './Spinner';

const Gallery = () => {
    const [posts, setPosts] = useState<GalleryPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPosts = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const galleryPosts = await getGalleryPosts();
                setPosts(galleryPosts);
            } catch (err) {
                setError('Failed to load gallery.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPosts();
    }, []);

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Inspiration Gallery</h1>
                <p className="text-gray-600 mb-8">See what amazing things have been created from re-threaded materials!</p>

                {isLoading && <div className="flex justify-center p-12"><Spinner /></div>}
                {error && <p className="text-center text-red-500">{error}</p>}
                
                {!isLoading && (
                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                        {posts.map(post => (
                           <div key={post.id} className="break-inside-avoid bg-white rounded-lg shadow-md overflow-hidden group">
                                <img src={post.imageUrl} alt={post.title} className="w-full object-cover"/>
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-800">{post.title}</h3>
                                    <p className="text-sm text-gray-500">by {post.user?.displayName || 'a crafter'}</p>
                                    {post.originalListingId && (
                                        <a href="#" className="text-xs text-teal-600 hover:underline mt-1 block">
                                            View original materials
                                        </a>
                                    )}
                                </div>
                           </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Gallery;
