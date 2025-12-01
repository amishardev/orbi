
import type { User, Community, Post, Conversation } from '@/lib/types';

// This file contains static data for demonstration purposes.
// In a real application, this data would be fetched from a database.

export const users: Omit<User, 'joinDate'>[] = [
  {
    id: 'user-1',
    userId: 'user-1',
    email: 'bogdan@example.com',
    name: 'Bogdan Nikitin',
    username: 'nikitinteam',

    photoURL: 'https://picsum.photos/seed/101/200/200',
    coverPhoto: 'https://picsum.photos/seed/201/1200/400',
    headline: 'Senior Frontend Engineer at Google | React, Next.js, and Design Systems',
    bio: 'Frontend Developer passionate about React, Design Systems, and hiking. Building beautiful and accessible user experiences.',
    education: [
      { degree: 'B.S. in Computer Science', school: 'University of Washington', year: '2020' },
    ],
    work: [
      { title: 'Software Engineer', company: 'TechCorp', years: '2021-Present' },
      { title: 'Frontend Intern', company: 'WebSolutions', years: '2019' },
    ],
    interests: ['Web Development', 'UX/UI Design', 'Hiking', 'Photography'],
    skills: ['React', 'TypeScript', 'Next.js', 'Figma', 'GraphQL'],
    username_lowercase: 'nikitinteam',
    displayName_lowercase: 'bogdan nikitin',
    displayName: 'Bogdan Nikitin',
    followers: ['user-2', 'user-3'],
    following: ['user-2'],
    followersCount: 2,
    followingCount: 1,
    postsCount: 5,
    profileVisibility: 'public',
    allowMessages: true,
    isVerified: true,
  },
  {
    id: 'user-2',
    userId: 'user-2',
    email: 'nick@example.com',
    name: 'Nick Shelburne',
    username: 'nickshel',

    photoURL: 'https://picsum.photos/seed/102/200/200',
    coverPhoto: 'https://picsum.photos/seed/202/1200/400',
    headline: 'Pastry Chef & Food Blogger | The Sweet Spot Bakery',
    bio: 'Baker and food blogger. Exploring the world one pastry at a time.',
    education: [
      { degree: 'Certificate in Pastry Arts', school: 'Le Cordon Bleu', year: '2018' },
    ],
    work: [
      { title: 'Pastry Chef', company: 'The Sweet Spot Bakery', years: '2019-Present' },
    ],
    interests: ['Baking', 'Food Photography', 'Travel'],
    skills: ['Sourdough', 'French Pastry', 'Food Styling'],
    username_lowercase: 'nickshel',
    displayName_lowercase: 'nick shelburne',
    displayName: 'Nick Shelburne',
    followers: ['user-1'],
    following: ['user-1'],
    followersCount: 1,
    followingCount: 1,
    postsCount: 12,
    profileVisibility: 'public',
    allowMessages: true,
    isVerified: false,
  },
];


export const communities: Community[] = [
  {
    id: 'comm-1',
    name: 'Next.js Developers',
    slug: 'nextjs-devs',
    description: 'A community for developers using the Next.js framework. Share your projects, ask questions, and collaborate.',
    avatar: 'https://picsum.photos/seed/401/200/200',
    banner: 'https://picsum.photos/seed/501/1200/300',
    memberCount: 12500,
    members: ['user-1', 'user-3'],
  },
  {
    id: 'comm-2',
    name: 'Outdoor Adventurers',
    slug: 'outdoor-adventures',
    description: 'For those who love hiking, camping, and exploring the great outdoors. Share your favorite trails and gear.',
    avatar: 'https://picsum.photos/seed/402/200/200',
    banner: 'https://picsum.photos/seed/502/1200/300',
    memberCount: 8900,
    members: ['user-1', 'user-4'],
  },
  {
    id: 'comm-3',
    name: 'Bay Area Bakers',
    slug: 'bay-area-bakers',
    description: 'A local group for baking enthusiasts in the San Francisco Bay Area to share recipes, tips, and creations.',
    avatar: 'https://picsum.photos/seed/403/200/200',
    banner: 'https://picsum.photos/seed/503/1200/300',
    memberCount: 2300,
    members: ['user-2'],
  },
  {
    id: 'comm-4',
    name: 'Digital Artists Collective',
    slug: 'digital-artists',
    description: 'A space for digital illustrators, painters, and designers to showcase their work and exchange techniques.',
    avatar: 'https://picsum.photos/seed/404/200/200',
    banner: 'https://picsum.photos/seed/504/1200/300',
    memberCount: 15000,
    members: ['user-3'],
  },
];

export const posts: Post[] = [];

export const conversations: Conversation[] = [
  {
    id: 'conv-1',
    userId: 'user-2',
    messages: [
      { id: 'msg-1-1', senderId: 'user-2', text: 'Hey! Did you see my latest post about the croissants?', timestamp: '10:30 AM' },
      { id: 'msg-1-2', senderId: 'user-1', text: 'Yes, they looked amazing! You have to share the recipe.', timestamp: '10:31 AM' },
      { id: 'msg-1-3', senderId: 'user-2', text: 'Haha, maybe! It\'s a trade secret 😉', timestamp: '10:32 AM' },
    ]
  },
  {
    id: 'conv-2',
    userId: 'user-3',
    messages: [
      { id: 'msg-2-1', senderId: 'user-3', text: 'Loved your latest artwork!', timestamp: 'Yesterday' },
      { id: 'msg-2-2', senderId: 'user-1', text: 'Thanks! I appreciate it.', timestamp: 'Yesterday' },
    ]
  },
  {
    id: 'conv-3',
    userId: 'user-4',
    messages: [
      { id: 'msg-3-1', senderId: 'user-4', text: 'We should go hiking again soon.', timestamp: '2 days ago' },
    ]
  }
];
