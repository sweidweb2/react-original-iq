import type { ServicesContent } from './services'

export const servicesEn: ServicesContent = {
  trendingSubjects: [
    'Adobe InDesign',
    'Algebra 1',
    'Algebra 2',
    'Calculus',
    'Chemistry',
    'Physics',
    'Series 63',
    'Sociology',
    'Visual Basic',
  ],
  heroStats: [
    { text: 'Thousands of 5-star reviews', tone: 'success' },
    { text: '100 expert tutors in 50 subjects', tone: 'accent' },
    { text: 'Find a great match with our Good Fit Guarantee', tone: 'warning' },
  ],
  serviceSections: [
    {
      id: 'research',
      badge: 'Research',
      title: 'Comprehensive Research Assistance',
      description:
        'Unlock the power of academic research with our expert guidance. From literature reviews to data analysis, we provide comprehensive support for your research projects and academic publications.',
      accent: 'var(--primary)',
      accentLight: 'var(--primary-light)',
      visualFirst: false,
      points: [
        {
          icon: 'literatureReview',
          title: 'Literature Review',
          description:
            'Thorough analysis of existing research with proper citations and references',
        },
        {
          icon: 'dataAnalysis',
          title: 'Data Analysis',
          description:
            'Statistical analysis and interpretation of research data using advanced methodologies',
        },
        {
          icon: 'academicWriting',
          title: 'Academic Writing',
          description:
            'Professional research papers, theses, and publications that meet academic standards',
        },
      ],
      orbit: [
        { icon: 'literatureReview', label: 'Literature Review' },
        { icon: 'dataAnalysis', label: 'Data Analysis' },
        { icon: 'academicWriting', label: 'Academic Writing' },
        { icon: 'qualityAssurance', label: 'Quality Assurance' },
        { icon: 'researchMethodology', label: 'Research Methodology' },
      ],
    },
    {
      id: 'tutoring',
      badge: 'Training',
      title: 'Personalized One-on-One Teaching',
      description:
        "Experience learning like never before with our expert tutors who adapt to your unique learning style. Whether you're struggling with complex concepts or aiming for top grades, our personalized approach ensures you achieve your academic goals.",
      accent: 'var(--warning)',
      accentLight: 'var(--warning)',
      visualFirst: true,
      points: [
        {
          icon: 'learningPlans',
          title: 'Customized Learning Plans',
          description: 'Tailored curriculum based on your strengths and areas for improvement',
        },
        {
          icon: 'progressTracking',
          title: 'Real-Time Progress Tracking',
          description: 'Monitor your improvement with detailed analytics and reports',
        },
        {
          icon: 'flexibleScheduling',
          title: 'Flexible Scheduling',
          description: 'Book sessions at your convenience, 24/7 availability',
        },
      ],
      orbit: [
        { icon: 'learningPlans', label: 'Customized Learning Plans' },
        { icon: 'progressTracking', label: 'Real-Time Progress Tracking' },
        { icon: 'flexibleScheduling', label: 'Flexible Scheduling' },
      ],
    },
    {
      id: 'assignment',
      badge: 'Project Support',
      title: 'Professional Project Assistance',
      description:
        'Get expert help with your academic and research projects. Our team of qualified professionals ensures high-quality, original work that meets your educational goals and deadlines.',
      accent: 'var(--chart-5)',
      accentLight: 'var(--chart-5)',
      visualFirst: false,
      points: [
        {
          icon: 'originalContent',
          title: 'Original Content',
          description: '100% plagiarism-free work with proper citations and references',
        },
        {
          icon: 'fastTurnaround',
          title: 'Fast Turnaround',
          description: 'Meet tight deadlines without compromising on quality',
        },
        {
          icon: 'unlimitedRevisions',
          title: 'Unlimited Revisions',
          description: "Free revisions until you're completely satisfied",
        },
      ],
      orbit: [
        { icon: 'literatureReview', label: 'Literature Review' },
        { icon: 'dataAnalysis', label: 'Data Analysis' },
        { icon: 'academicWriting', label: 'Academic Writing' },
      ],
    },
  ],
  programSteps: [
    {
      title: 'Intensive Coding Bootcamps',
      description:
        'Accelerate your coding skills with intensive, hands-on programming camps covering web development, data science, and software engineering',
    },
    {
      title: 'Custom Academic Curricula',
      description:
        'Tailored learning paths for specialized subjects, advanced topics, and unique academic requirements',
    },
    {
      title: 'Structured Learning Paths',
      description:
        'Follow carefully designed curricula that build skills progressively from fundamentals to advanced concepts',
    },
  ],
  benefits: [
    {
      icon: 'provenSuccess',
      title: 'Proven Success',
      description:
        'Over 1,000+ students have achieved their academic goals with our expert guidance and personalized support',
    },
    {
      icon: 'expertMentors',
      title: 'Expert Mentors',
      description:
        'Learn from qualified professionals with advanced degrees and years of teaching experience in their fields',
    },
    {
      icon: 'qualityAssured',
      title: 'Quality Assured',
      description:
        'We maintain the highest standards in all our deliverables with rigorous quality control processes',
    },
    {
      icon: 'personalizedLearning',
      title: 'Personalized Learning',
      description:
        'Get tailored academic support designed to match your unique goals, pace, and learning style',
    },
  ],
  pricingPlans: [
    {
      kind: 'projects',
      title: 'Projects / Assignments / Research Papers',
      start: '$50',
      max: '$10,000',
      endColor: 'var(--accent)',
      factors: [
        { icon: 'complicatedSubjects', label: 'Complicated Subjects' },
        { icon: 'extensiveResearch', label: 'Extensive Research' },
        { icon: 'complicatedRequirements', label: 'Complicated Requirements' },
        { icon: 'higherDifficulty', label: 'Higher Difficulty Level' },
        { icon: 'shorterTimeFrame', label: 'Shorter Time Frame' },
      ],
    },
    {
      kind: 'tutoring',
      title: 'Tutoring Services',
      start: '$20',
      max: '$150',
      endColor: 'var(--primary)',
      factors: [
        { icon: 'complicatedSubjects', label: 'Complicated Subjects' },
        { icon: 'personalizedPlan', label: 'Personalized Learning Plan' },
        { icon: 'instructorRequired', label: 'Instructor Required' },
        { icon: 'sessionsRequired', label: 'Number of Sessions Required' },
      ],
    },
  ],
}
