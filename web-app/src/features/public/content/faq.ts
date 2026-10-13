export type FaqItem = {
  question: string
  answer: string
}

export type FaqCategory = {
  id: string
  title: string
  items: FaqItem[]
}

export const faqCategories = [
  {
    id: 'general',
    title: 'General Questions',
    items: [
      {
        question: 'What is Original IQ?',
        answer:
          'Original IQ is a registered Lebanese company headquartered in Bauchrieh, Lebanon 🇱🇧. It operates across multiple departments, including its Consultancy Department, which specializes in academic and educational services. Through this department, we provide tutoring, assignment help, research support, and academic consultancy for students across Lebanon and the Gulf region.',
      },
      {
        question: 'How do I get started?',
        answer:
          'Getting started is simple: 1) Submit your request for the academic service you need (tutoring, research, assignment help, etc.). 2) Connect with an academic consultant who will evaluate your request and match you with the right tutor or specialist. 3) Select the right plan — short-term or long-term collaboration — based on your goals. 4) Once confirmed, your consultant will guide you step-by-step until your project or course is successfully completed.',
      },
      {
        question: 'What services do you offer?',
        answer:
          'The Consultancy Department of Original IQ offers: Personalized Tutoring in 50+ subjects, Assignment Help for essays, projects, and reports, Research Assistance for theses, dissertations, and journal work, and Academic Consultancy for full course coordination and graduation support.',
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing & Plans',
    items: [
      {
        question: 'How does pricing work?',
        answer:
          'Pricing depends on the subject, service type, and duration. We maintain affordable and flexible pricing plans, ensuring that every student can access high-quality support tailored to their academic level. You can request a custom quote through our support team.',
      },
      {
        question: 'Do you offer both short-term and long-term options?',
        answer:
          'Yes. We provide both: Short-term plans — for single assignments or limited tutoring sessions, and Long-term collaboration — for semester-long or ongoing academic mentorship. Students who choose long-term plans also receive periodic progress reports and performance tracking.',
      },
    ],
  },
  {
    id: 'tutoring',
    title: 'Tutoring & Academic Support',
    items: [
      {
        question: 'Who are your academic consultants?',
        answer:
          'Our network includes 100+ verified consultants and academic professionals with advanced degrees and years of teaching experience. Every consultant undergoes a screening process to ensure credibility, communication skills, and subject mastery.',
      },
      {
        question: 'Do you help with research and university projects?',
        answer:
          "Yes. Our research experts provide comprehensive academic assistance from proposal development and data analysis to report writing and formatting while maintaining strict confidentiality and originality. We have successfully assisted in the creation and publication of over 100 dissertations and theses at the bachelor's, master's, and PhD levels.",
      },
      {
        question: 'Do you provide help for students outside Lebanon?',
        answer:
          'Absolutely. Original IQ serves students across the globe through online tutoring and remote consultancy services available 24/7.',
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technical & Support',
    items: [
      {
        question: 'Where are you located?',
        answer:
          'We are located at Bambouk Center, 6th Floor, Bauchrieh, Lebanon. Our consultants operate both online and onsite, offering flexibility to accommodate all student needs.',
      },
      {
        question: 'How can I contact support?',
        answer:
          'You can reach us anytime via: 📧 Email: info@original-iq.com, 📞 Phone: +961 70 858 167 (Mon–Fri, 9AM–6PM), 💬 Live Chat: Available on our website. Premium members enjoy 24/7 priority support and faster response times.',
      },
    ],
  },
] satisfies FaqCategory[]
