export const homeEn = {
  documentTitle: 'Learn Smarter, Achieve More',
  hero: {
    titleLead: 'Learn',
    titleHighlight: 'Smarter',
    subtitle: 'Tailored guidance and flexible learning to boost your results.',
    signup: 'Join Our Community - Sign Up Now',
    leaveNumber: 'Immediate Help? Leave Your Number',
    imageAlt: 'Student learning',
    stats: [
      { value: '500+', label: 'Active Students' },
      { value: '100+', label: 'Expert Consultants' },
      { value: '50+', label: 'Subjects' },
    ],
    highlights: [
      { value: '100+', label: 'Expert Tutors' },
      { value: '100%', label: 'Success Rate' },
      { value: '24/7', label: 'Available' },
      { value: '50+', label: 'Subjects' },
      { value: '1000+', label: 'Consultations' },
    ],
  },
  testimonials: {
    title: 'What Students Say',
    intro:
      "Discover how our personalized tutoring approach has transformed academic success for students across the Gulf region. From struggling with complex concepts to achieving top grades, hear directly from learners who've experienced the Original IQ difference.",
    ratingLabel: (name: string) => `${name} rating`,
    items: [
      {
        name: 'Abdullah Al-Ahmad',
        meta: 'Mathematics • Kuwait',
        rating: 5,
        quote:
          'Original IQ matched me with an excellent tutor. My calculus grades improved from C to A in just one month.',
      },
      {
        name: 'Fatima Al-Salem',
        meta: 'Programming • UAE',
        rating: 5,
        quote:
          'The one-on-one sessions were very clear and practical. I finally understand data structures and algorithms.',
      },
      {
        name: 'Mohammed Al-Qahtani',
        meta: 'Scientific Research • Saudi Arabia',
        rating: 4,
        quote:
          'Excellent guidance on my research methodology chapter. The resources and feedback were extremely helpful.',
      },
      {
        name: 'Noor Al-Otaibi',
        meta: 'Physics • Qatar',
        rating: 5,
        quote:
          'Flexible scheduling and brilliant explanations. My confidence in physics has increased significantly.',
      },
      {
        name: 'Khalid Al-Mutairi',
        meta: 'English Language • Bahrain',
        rating: 5,
        quote:
          'Outstanding English tutoring service. My writing and speaking skills have improved dramatically.',
      },
      {
        name: 'Sara Al-Hassan',
        meta: 'Chemistry • Oman',
        rating: 5,
        quote:
          'The chemistry tutor made complex concepts so easy to understand. Highly recommended!',
      },
    ],
  },
  howItWorks: {
    title: 'How It Works',
    steps: [
      {
        title: 'Open Your Account Or Reach Out',
        description: 'Open your account or reach out to our team for immediate assistance.',
      },
      {
        title: 'Have Academic Consultant',
        description:
          'Our team of academic consultants is ready to assist you with your academic needs.',
      },
      {
        title: 'Choose the right service',
        description:
          "Choose the right service for your needs whether it's a single task, long-term support, or long-term support with full coordination.",
      },
      {
        title: 'Receive Outstanding Results',
        description: 'Receive the outstanding results you deserve from our expert tutors.',
      },
    ],
  },
  cta: {
    title: 'Ready to Start Your Learning Journey?',
    body: 'Join thousands of students who have already transformed their academic success with our platform.',
    button: 'Get Started Free',
  },
  process: {
    title: 'Our Process',
    intro: 'Experience a streamlined journey from inquiry to success with our proven methodology',
    stages: [
      {
        title: 'Single Task Service',
        description:
          "Request help for a single, specific assignment or project. We'll focus on delivering results for that one task only.",
        points: ['Pay per task, no ongoing contract', 'Get support just for one assignment'],
      },
      {
        title: 'Semester/Year',
        description:
          'We take charge of all your academic commitments for one full semester or year.',
        points: [
          'All coursework managed for a full semester or year',
          'Submit your requirements once—we handle the rest',
        ],
      },
      {
        title: 'Long-Term Support',
        description: "Enjoy true long-term support: we don't just help occasionally.",
        points: [
          'We oversee every assignment and requirement from start to finish',
          'Full coordination of all deadlines—nothing slips through the cracks',
        ],
      },
    ],
  },
  features: {
    title: 'Why Choose Us',
    intro: 'Everything you need for successful learning in one platform',
    imageAlt: 'Students working together',
    overlayTitle: 'Why Choose Us',
    overlayBody:
      'Experience the difference with our comprehensive academic support, expert guidance, and personalized learning approach that has helped thousands of students achieve their educational goals.',
    items: [
      {
        title: 'Expert Tutors',
        description:
          'Learn from verified professionals with years of teaching experience in their fields.',
      },
      {
        title: 'Track Progress',
        description:
          'Monitor your learning journey with detailed analytics and personalized insights.',
      },
      {
        title: 'Study Materials',
        description: 'Access a library of resources, practice tests, and downloadable content.',
      },
      {
        title: 'Affordable Pricing',
        description: 'Quality education at competitive rates with flexible payment plans.',
      },
    ],
  },
  lead: {
    title: 'Struggling with school or university work?',
    description: "Leave your country and phone number, and we'll reach out to assist you.",
    countryLabel: 'Country',
    countryPlaceholder: 'Search and select your country...',
    clearSearch: 'Clear search',
    countriesLabel: 'Countries',
    noResults: 'No results found',
    codeLabel: 'Country code',
    codePlaceholder: 'Code',
    phoneLabel: 'Phone number',
    phonePlaceholder: 'Phone Number',
    sending: 'Sending…',
    send: 'Send',
    success: "Thanks — we'll reach out to assist you.",
    failed: 'Could not send your details',
    validation: {
      selectCountry: 'Select your country',
      invalidPhone: 'Enter a valid phone number',
    },
  },
  whatsappLabel: 'Chat on WhatsApp',
}

export type HomeDictionary = typeof homeEn
