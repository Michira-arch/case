import type { PublicProfile } from './types'

export const MOCK_EXAMPLES: Record<string, PublicProfile> = {
  'a.njoroge': {
    id: 'example-aisha-njoroge-uuid',
    handle: 'a.njoroge',
    persona: 'service',
    display_name: 'Aisha Njoroge',
    role_line: 'Chef & Event Caterer',
    tagline: 'Expert in custom catering, local cuisines, and private chef services. Delivering memorable dining experiences for corporate events and private parties in Nairobi.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    socials: [
      { platform: 'WhatsApp', url: 'https://wa.me/254700000000' },
      { platform: 'Instagram', url: 'https://instagram.com/aisha_catering_nbi' }
    ],
    category: 'caterer',
    tags: ['catering', 'culinary', 'food'],
    location_area: 'Westlands, Nairobi',
    claim_text: 'I am a professional chef specializing in event catering. I believe in exquisite taste and premium presentation. Check my evidence below.',
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
        title: 'Catered for 100+ guest corporate launch',
        detail: 'Designed and executed a 4-course menu, managed kitchen staff, and handled table presentation for Nairobi Tech Hub\'s annual gala.',
        when_label: '2025',
        sort_order: 0,
        source: 'owner',
        created_at: '2026-01-01T00:00:00Z',
        evidence: [
          {
            id: 'ev-did-1',
            type: 'img',
            storage_key: 'https://images.unsplash.com/photo-1605497746444-ac9dba450f33?auto=format&fit=crop&w=600&q=80',
            caption: 'Plated gourmet presentation sample',
            width: 600,
            height: 400,
            duration_seconds: null
          }
        ]
      },
      {
        id: 'proof-trained-1',
        pillar: 'trained',
        title: 'Culinary Arts Diploma - Kenya Utalii College',
        detail: 'Completed a 2-year intensive program in professional cookery, food safety, and hospitality management.',
        when_label: 'Graduated 2022',
        sort_order: 1,
        source: 'owner',
        created_at: '2026-01-01T00:00:00Z',
        evidence: [
          {
            id: 'ev-trained-1',
            type: 'img',
            storage_key: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
            caption: 'College Graduation Certificate',
            width: 600,
            height: 400,
            duration_seconds: null
          }
        ]
      },
      {
        id: 'proof-vouched-1',
        pillar: 'vouched',
        title: '"Exceptional taste and flawless service"',
        detail: 'From Mercy Mutua (Corporate Client): "Aisha catered our year-end dinner. The food was absolutely delicious, served hot, and the team was highly professional. Highly recommended!"',
        when_label: 'February 2026',
        sort_order: 2,
        source: 'vouch_request',
        created_at: '2026-02-15T00:00:00Z',
        evidence: []
      },
      {
        id: 'proof-aiming-1',
        pillar: 'aiming',
        title: 'Opening a dedicated catering studio in Kilimani',
        detail: 'Looking to lease a commercial kitchen space to support larger event orders. Open to corporate catering partnerships.',
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
    role_line: 'Digital Marketing Specialist',
    tagline: 'Helping local brands grow their online presence. Experienced in social media management, Google Ads, and customer acquisition campaigns.',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    socials: [
      { platform: 'LinkedIn', url: 'https://linkedin.com/in/joy-kimani' }
    ],
    category: 'marketer',
    tags: ['marketing', 'socialmedia', 'growth'],
    location_area: 'Nairobi CBD',
    claim_text: 'I help brands grow and manage their digital operations. I specialize in creative assets and clear campaign reporting.',
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
        title: 'Managed Holiday Growth Campaign for Retailer',
        detail: 'Ran social media ads and newsletter campaigns that drove a 35% increase in orders over the December period for a local retailer.',
        when_label: '2025',
        sort_order: 0,
        source: 'owner',
        created_at: '2026-01-01T00:00:00Z',
        evidence: [
          {
            id: 'ev-did-3',
            type: 'img',
            storage_key: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
            caption: 'Campaign performance dashboard snippet',
            width: 600,
            height: 400,
            duration_seconds: null
          }
        ]
      },
      {
        id: 'proof-trained-3',
        pillar: 'trained',
        title: 'Google Digital Marketing Certification',
        detail: 'Completed intensive coursework on SEO, SEM, content strategy, and web analytics.',
        when_label: 'Cert June 2024',
        sort_order: 1,
        source: 'owner',
        created_at: '2026-01-01T00:00:00Z',
        evidence: []
      },
      {
        id: 'proof-vouched-3',
        pillar: 'vouched',
        title: '"A self-driven marketer who gets results"',
        detail: 'From John Mwangi (Operations Director): "Joy ran our social media marketing for 3 months. She restructured our ad copy and helped us acquire over 250 new leads. Excellent initiative."',
        when_label: 'November 2025',
        sort_order: 2,
        source: 'vouch_request',
        created_at: '2025-11-20T00:00:00Z',
        evidence: []
      },
      {
        id: 'proof-aiming-3',
        pillar: 'aiming',
        title: 'Seeking full-time Social Media Manager roles',
        detail: 'Looking to join a growing marketing agency or brand where I can manage ad campaigns, collaborate on copy, and expand operations.',
        when_label: 'Ready to start',
        sort_order: 3,
        source: 'owner',
        created_at: '2026-03-01T00:00:00Z',
        evidence: []
      }
    ]
  }
}
