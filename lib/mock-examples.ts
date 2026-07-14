import type { PublicProfile } from './types'

export const MOCK_EXAMPLES: Record<string, PublicProfile> = {
  'a.njoroge': {
    id: 'example-aisha-njoroge-uuid',
    handle: 'a.njoroge',
    persona: 'service',
    display_name: 'Aisha Njoroge',
    role_line: 'Freelance Braider & Hair Stylist',
    tagline: 'Expert in knotless braids, soft locs, and custom bridal hair styling. Providing high-quality, neat, and convenient hair care at your home within Nairobi.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    socials: [
      { platform: 'WhatsApp', url: 'https://wa.me/254700000000' },
      { platform: 'Instagram', url: 'https://instagram.com/aisha_braids_nbi' }
    ],
    category: 'hairstylist',
    tags: ['braids', 'hairstyling', 'beauty'],
    location_area: 'Westlands, Nairobi',
    claim_text: 'I am a professional hair stylist specializing in custom braids. I believe in neatness and speed. Check my evidence below.',
    contact_visibility: { phone: true, email: true, whatsapp: true, location: true },
    locale: 'en',
    plan: 'plus',
    plan_expires: '2030-01-01T00:00:00Z',
    showcase_images: [
      'https://images.unsplash.com/photo-1620331702289-44b209d4af7f?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80'
    ],
    proof_items: [
      {
        id: 'proof-did-1',
        pillar: 'did',
        title: 'Styled 15+ Brides for weddings in 2025',
        detail: 'Handled full bridal team hair styling, veil installations, and touch-ups throughout the day. Got five-star reviews from every wedding coordinator.',
        when_label: '2025',
        sort_order: 0,
        source: 'owner',
        created_at: '2026-01-01T00:00:00Z',
        evidence: [
          {
            id: 'ev-did-1',
            type: 'img',
            storage_key: 'https://images.unsplash.com/photo-1605497746444-ac9dba450f33?auto=format&fit=crop&w=600&q=80',
            caption: 'Elegant bridal styling sample',
            width: 600,
            height: 400,
            duration_seconds: null
          }
        ]
      },
      {
        id: 'proof-trained-1',
        pillar: 'trained',
        title: 'Cosmetology Diploma - Ashley\'s Beauty College',
        detail: 'Completed a 1-year intensive training in hair styling, scalp care, and client management. Graduated top of the class.',
        when_label: 'Graduated 2022',
        sort_order: 1,
        source: 'owner',
        created_at: '2026-01-01T00:00:00Z',
        evidence: [
          {
            id: 'ev-trained-1',
            type: 'img',
            storage_key: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
            caption: 'Ashley\'s Beauty Academy Certificate',
            width: 600,
            height: 400,
            duration_seconds: null
          }
        ]
      },
      {
        id: 'proof-vouched-1',
        pillar: 'vouched',
        title: '"Highly recommended for neatness and speed"',
        detail: 'From Mercy Mutua (Regular Client): "Aisha has done my braids for 3 years. She is always on time, does not pull my edges, and the braids last over 6 weeks! She is the best."',
        when_label: 'February 2026',
        sort_order: 2,
        source: 'vouch_request',
        created_at: '2026-02-15T00:00:00Z',
        evidence: []
      },
      {
        id: 'proof-aiming-1',
        pillar: 'aiming',
        title: 'Opening a dedicated salon studio in Kilimani',
        detail: 'Looking for a styling space to accommodate walk-in clients. Open to partnerships or booth rentals starting mid-2026.',
        when_label: 'Target: July 2026',
        sort_order: 3,
        source: 'owner',
        created_at: '2026-03-01T00:00:00Z',
        evidence: []
      }
    ]
  },
  'm.obwaka': {
    id: 'example-moses-obwaka-uuid',
    handle: 'm.obwaka',
    persona: 'professional',
    display_name: 'Dr. Moses Obwaka',
    role_line: 'ICU Critical Care Nurse Practitioner',
    tagline: 'Registered Nurse with specialized training in ICU care, ventilator management, and cardiac life support. Passionate about clinical excellence and patient advocacy.',
    avatar_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80',
    socials: [
      { platform: 'LinkedIn', url: 'https://linkedin.com/in/moses-obwaka' }
    ],
    category: 'nurse',
    tags: ['icu', 'nursing', 'medical'],
    location_area: 'Aga Khan Hospital Area, Nairobi',
    claim_text: 'As an ICU Critical Care Nurse Practitioner, I ensure maximum clinical care and patient advocacy. My qualifications below prove my competence.',
    contact_visibility: { phone: true, email: true, whatsapp: true, location: true },
    locale: 'en',
    plan: 'plus',
    plan_expires: '2030-01-01T00:00:00Z',
    showcase_images: [
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80'
    ],
    proof_items: [
      {
        id: 'proof-did-2',
        pillar: 'did',
        title: 'ICU Shift Leader - Aga Khan Hospital',
        detail: 'Supervised a team of 6 nurses in a 12-bed ICU ward. Directed critical trauma responses and drug administrations.',
        when_label: '2023–Present',
        sort_order: 0,
        source: 'owner',
        created_at: '2026-01-01T00:00:00Z',
        evidence: []
      },
      {
        id: 'proof-trained-2',
        pillar: 'trained',
        title: 'B.Sc. in Nursing — University of Nairobi',
        detail: 'Completed a 4-year degree program with honors. Specialized clinical placements in emergency care.',
        when_label: 'Class of 2021',
        sort_order: 1,
        source: 'owner',
        created_at: '2026-01-01T00:00:00Z',
        evidence: [
          {
            id: 'ev-trained-2',
            type: 'img',
            storage_key: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
            caption: 'Nursing Degree Certificate',
            width: 600,
            height: 400,
            duration_seconds: null
          }
        ]
      },
      {
        id: 'proof-vouched-2',
        pillar: 'vouched',
        title: '"Extremely competent and calm under pressure"',
        detail: 'From Dr. Grace Kamau (Senior ICU Physician): "Dr. Obwaka has worked under my supervision during several high-risk cardiac surgeries. He exhibits outstanding clinical judgement and speed."',
        when_label: 'January 2026',
        sort_order: 2,
        source: 'vouch_request',
        created_at: '2026-01-10T00:00:00Z',
        evidence: []
      },
      {
        id: 'proof-aiming-2',
        pillar: 'aiming',
        title: 'Seeking Senior Clinical Supervisor Roles',
        detail: 'Ready to transition into administrative medical leadership or clinical training positions to help scale hospital operations.',
        when_label: 'Immediate availability',
        sort_order: 3,
        source: 'owner',
        created_at: '2026-03-01T00:00:00Z',
        evidence: []
      }
    ]
  },
  'j.kimani': {
    id: 'example-joy-kimani-uuid',
    handle: 'j.kimani',
    persona: 'jobseeker',
    display_name: 'Joy Kimani',
    role_line: 'Junior Frontend Web Developer',
    tagline: 'Self-taught React developer with a strong foundation in modern CSS, Next.js, and Supabase database integrations. Keen on building fast, pixel-perfect user interfaces.',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    socials: [
      { platform: 'GitHub', url: 'https://github.com/joy-kimani' },
      { platform: 'LinkedIn', url: 'https://linkedin.com/in/joy-kimani' }
    ],
    category: 'developer',
    tags: ['react', 'nextjs', 'css'],
    location_area: 'Nairobi CBD',
    claim_text: 'I build responsive frontend web applications using React and Next.js. I have a strong foundation in modern web design.',
    contact_visibility: { phone: true, email: true, whatsapp: true, location: true },
    locale: 'en',
    plan: 'free',
    plan_expires: null,
    showcase_images: [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80'
    ],
    proof_items: [
      {
        id: 'proof-did-3',
        pillar: 'did',
        title: 'Built & Deployed Local E-Commerce Directory',
        detail: 'Built a directory website for small traders using React, CSS Modules, and Supabase. Handled over 1,200 active local visitors.',
        when_label: '2025',
        sort_order: 0,
        source: 'owner',
        created_at: '2026-01-01T00:00:00Z',
        evidence: [
          {
            id: 'ev-did-3',
            type: 'img',
            storage_key: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
            caption: 'Directory codebase & UI showcase',
            width: 600,
            height: 400,
            duration_seconds: null
          }
        ]
      },
      {
        id: 'proof-trained-3',
        pillar: 'trained',
        title: 'ALX Software Engineering Program',
        detail: 'Completed a 9-month rigorous training in computer science, full-stack web engineering, and collaborative team sprints.',
        when_label: 'Cert June 2024',
        sort_order: 1,
        source: 'owner',
        created_at: '2026-01-01T00:00:00Z',
        evidence: []
      },
      {
        id: 'proof-vouched-3',
        pillar: 'vouched',
        title: '"A self-driven developer who learns fast"',
        detail: 'From John Mwangi (Product Manager): "Joy interned with us for 3 months and rebuilt our customer portal dashboard. She picked up Tailwind and TypeScript in days. Outstanding initiative."',
        when_label: 'November 2025',
        sort_order: 2,
        source: 'vouch_request',
        created_at: '2025-11-20T00:00:00Z',
        evidence: []
      },
      {
        id: 'proof-aiming-3',
        pillar: 'aiming',
        title: 'Seeking full-time Junior React Developer roles',
        detail: 'Looking for a supportive engineering team where I can contribute to front-end development, learn testing frameworks, and expand my skills.',
        when_label: 'Ready to start',
        sort_order: 3,
        source: 'owner',
        created_at: '2026-03-01T00:00:00Z',
        evidence: []
      }
    ]
  }
}
