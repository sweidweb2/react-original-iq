import type { ServicesContent } from './services'

export const servicesAr: ServicesContent = {
  trendingSubjects: [
    'Adobe InDesign',
    'الجبر 1',
    'الجبر 2',
    'التفاضل والتكامل',
    'الكيمياء',
    'الفيزياء',
    'Series 63',
    'علم الاجتماع',
    'Visual Basic',
  ],
  heroStats: [
    { text: 'آلاف التقييمات بخمس نجوم', tone: 'success' },
    { text: '100 مدرّس خبير في 50 مادة', tone: 'accent' },
    { text: 'نضمن لك المدرّس الأنسب لاحتياجاتك', tone: 'warning' },
  ],
  serviceSections: [
    {
      id: 'research',
      badge: 'الأبحاث',
      title: 'دعم شامل للأبحاث',
      description:
        'اكتشف قوة البحث الأكاديمي بإرشاد من خبرائنا. من مراجعة الأدبيات إلى تحليل البيانات، نقدّم دعمًا متكاملًا لمشاريعك البحثية ومنشوراتك الأكاديمية.',
      accent: 'var(--primary)',
      accentLight: 'var(--primary-light)',
      visualFirst: false,
      points: [
        {
          icon: 'literatureReview',
          title: 'مراجعة الأدبيات',
          description: 'تحليل معمّق للدراسات السابقة مع توثيق صحيح للمصادر والمراجع',
        },
        {
          icon: 'dataAnalysis',
          title: 'تحليل البيانات',
          description: 'تحليل إحصائي لبيانات البحث وتفسيرها باستخدام منهجيات متقدّمة',
        },
        {
          icon: 'academicWriting',
          title: 'الكتابة الأكاديمية',
          description: 'أوراق بحثية ورسائل ومنشورات احترافية تستوفي المعايير الأكاديمية',
        },
      ],
      orbit: [
        { icon: 'literatureReview', label: 'مراجعة الأدبيات' },
        { icon: 'dataAnalysis', label: 'تحليل البيانات' },
        { icon: 'academicWriting', label: 'الكتابة الأكاديمية' },
        { icon: 'qualityAssurance', label: 'ضمان الجودة' },
        { icon: 'researchMethodology', label: 'منهجية البحث' },
      ],
    },
    {
      id: 'tutoring',
      badge: 'الدروس الخصوصية',
      title: 'تعليم فردي مصمَّم لك',
      description:
        'عِش تجربة تعلّم مختلفة مع مدرّسين خبراء يتكيّفون مع أسلوبك الخاص في التعلّم. سواء كنت تواجه صعوبة في فهم مفاهيم معقّدة أو تطمح إلى أعلى الدرجات، يضمن لك نهجنا المخصّص تحقيق أهدافك الأكاديمية.',
      accent: 'var(--warning)',
      accentLight: 'var(--warning)',
      visualFirst: true,
      points: [
        {
          icon: 'learningPlans',
          title: 'خطط تعلّم مخصّصة',
          description: 'منهج مصمّم حسب نقاط قوتك والجوانب التي تحتاج إلى تطوير',
        },
        {
          icon: 'progressTracking',
          title: 'متابعة فورية للتقدّم',
          description: 'تابع تحسّنك من خلال تحليلات وتقارير مفصّلة',
        },
        {
          icon: 'flexibleScheduling',
          title: 'مواعيد مرنة',
          description: 'احجز جلساتك في الوقت الذي يناسبك، على مدار الساعة',
        },
      ],
      orbit: [
        { icon: 'learningPlans', label: 'خطط تعلّم مخصّصة' },
        { icon: 'progressTracking', label: 'متابعة فورية للتقدّم' },
        { icon: 'flexibleScheduling', label: 'مواعيد مرنة' },
      ],
    },
    {
      id: 'assignment',
      badge: 'دعم المشاريع',
      title: 'مساعدة احترافية في المشاريع',
      description:
        'احصل على مساعدة الخبراء في مشاريعك الأكاديمية والبحثية. يحرص فريقنا من المتخصصين المؤهلين على تقديم عمل أصيل وعالي الجودة يحقق أهدافك التعليمية ويلتزم بمواعيدك.',
      accent: 'var(--chart-5)',
      accentLight: 'var(--chart-5)',
      visualFirst: false,
      points: [
        {
          icon: 'originalContent',
          title: 'محتوى أصيل',
          description: 'عمل خالٍ تمامًا من الانتحال مع توثيق صحيح للمصادر والمراجع',
        },
        {
          icon: 'fastTurnaround',
          title: 'إنجاز سريع',
          description: 'نلتزم بأضيق المواعيد النهائية دون المساس بالجودة',
        },
        {
          icon: 'unlimitedRevisions',
          title: 'تعديلات غير محدودة',
          description: 'تعديلات مجانية حتى تكون راضيًا تمامًا',
        },
      ],
      orbit: [
        { icon: 'literatureReview', label: 'مراجعة الأدبيات' },
        { icon: 'dataAnalysis', label: 'تحليل البيانات' },
        { icon: 'academicWriting', label: 'الكتابة الأكاديمية' },
      ],
    },
  ],
  programSteps: [
    {
      title: 'معسكرات برمجة مكثّفة',
      description:
        'طوّر مهاراتك البرمجية بسرعة من خلال معسكرات عملية مكثّفة تغطي تطوير الويب وعلم البيانات وهندسة البرمجيات',
    },
    {
      title: 'مناهج أكاديمية مخصّصة',
      description:
        'مسارات تعلّم مصمّمة للمواد المتخصصة والموضوعات المتقدّمة والمتطلبات الأكاديمية الخاصة',
    },
    {
      title: 'مسارات تعلّم منظّمة',
      description: 'مناهج مدروسة بعناية تبني مهاراتك تدريجيًا من الأساسيات حتى المفاهيم المتقدّمة',
    },
  ],
  benefits: [
    {
      icon: 'provenSuccess',
      title: 'نجاح مثبت',
      description: 'أكثر من 1,000 طالب حققوا أهدافهم الأكاديمية بفضل إرشاد خبرائنا ودعمنا المخصّص',
    },
    {
      icon: 'expertMentors',
      title: 'مرشدون خبراء',
      description:
        'تعلّم على أيدي متخصصين مؤهلين يحملون شهادات عليا ولديهم سنوات من الخبرة التعليمية',
    },
    {
      icon: 'qualityAssured',
      title: 'جودة مضمونة',
      description: 'نلتزم بأعلى المعايير في جميع أعمالنا من خلال إجراءات صارمة لضبط الجودة',
    },
    {
      icon: 'personalizedLearning',
      title: 'تعلّم مخصّص',
      description: 'دعم أكاديمي مصمّم ليناسب أهدافك وسرعتك وأسلوبك في التعلّم',
    },
  ],
  pricingPlans: [
    {
      kind: 'projects',
      title: 'المشاريع / الواجبات / الأوراق البحثية',
      start: '$50',
      max: '$10,000',
      endColor: 'var(--accent)',
      factors: [
        { icon: 'complicatedSubjects', label: 'مواد معقّدة' },
        { icon: 'extensiveResearch', label: 'بحث موسّع' },
        { icon: 'complicatedRequirements', label: 'متطلبات معقّدة' },
        { icon: 'higherDifficulty', label: 'مستوى صعوبة أعلى' },
        { icon: 'shorterTimeFrame', label: 'مدة تسليم أقصر' },
      ],
    },
    {
      kind: 'tutoring',
      title: 'خدمات الدروس الخصوصية',
      start: '$20',
      max: '$150',
      endColor: 'var(--primary)',
      factors: [
        { icon: 'complicatedSubjects', label: 'مواد معقّدة' },
        { icon: 'personalizedPlan', label: 'خطة تعلّم مخصّصة' },
        { icon: 'instructorRequired', label: 'المدرّس المطلوب' },
        { icon: 'sessionsRequired', label: 'عدد الجلسات المطلوبة' },
      ],
    },
  ],
}
