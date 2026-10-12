export const SUPPORT_EMAIL = "info@seethestarsllc.com";

export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqCategory = {
  title: string;
  description: string;
  items: FaqItem[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: "Getting started",
    description: "Set up your family and help kids sign in.",
    items: [
      {
        question: "What is Kids Xtra?",
        answer:
          "Kids Xtra is a family responsibility and earning system. Parents create Missions, kids complete them, parents review the work, and kids earn Credits they can save or spend on parent-created rewards.",
      },
      {
        question: "How do I get started as a parent?",
        answer:
          "Create a parent account, add each child, create your first Mission, add a few rewards, then share the family code and child PINs with your kids.",
      },
      {
        question: "Do children need email addresses?",
        answer:
          "No. Children sign in with your family code, choose their profile, and enter their four-digit PIN. Parent accounts control the family, billing, Missions, rewards, and approvals.",
      },
      {
        question: "Where do I find the family code?",
        answer:
          "The family code appears on the parent dashboard. Kids enter it on the Kid Login screen before choosing their profile.",
      },
      {
        question: "What should I do if a child forgets their PIN?",
        answer:
          "Open Children from the parent menu, choose the child, and set a new PIN. Existing PINs are not displayed for safety.",
      },
    ],
  },
  {
    title: "Missions and approvals",
    description: "Understand completion, photo proof, and Mission Checks.",
    items: [
      {
        question: "How do Missions work?",
        answer:
          "Parents create Missions with a schedule, Credit value, XP, optional checklist items, and optional photo proof. Kids see assigned Missions in Kid Mode and submit them when finished.",
      },
      {
        question: "What happens when a child completes a Mission?",
        answer:
          "The Mission moves to Mission Checks for the parent. Credits are added only after a parent approves the completion.",
      },
      {
        question: "Can I require photo proof?",
        answer:
          "Yes. Turn on photo proof when creating or editing a Mission. Kids can take or upload proof as part of the completion flow.",
      },
      {
        question: "What does Needs More Work mean?",
        answer:
          "Needs More Work lets a parent send a Mission back with feedback instead of approving it. The child can review the note, finish the missing work, and submit again.",
      },
      {
        question: "Can I approve many Missions at once?",
        answer:
          "Yes. When multiple Mission Checks are waiting, the approvals page can show an approve-all action for pending Mission completions.",
      },
    ],
  },
  {
    title: "Credits, rewards, and goals",
    description: "Help kids earn, save, and redeem.",
    items: [
      {
        question: "What are Credits?",
        answer:
          "Credits are the in-app earning points kids receive after approved Missions. They can save Credits toward goals or request rewards from the family reward shop.",
      },
      {
        question: "How do rewards work?",
        answer:
          "Parents create rewards and set the Credit cost. When a child has enough Credits, they can request the reward. A parent approves or denies the request.",
      },
      {
        question: "Can children save for a goal?",
        answer:
          "Yes. Children can set a reward as their goal, see progress, and decide whether to keep saving or spend Credits on something else.",
      },
      {
        question: "Can parents remove or edit rewards?",
        answer:
          "Yes. Parents manage rewards from the parent rewards page, including adding, editing, deactivating, or fulfilling reward requests.",
      },
    ],
  },
  {
    title: "Devices, privacy, and billing",
    description: "Use Kids Xtra safely across your family devices.",
    items: [
      {
        question: "How do I install Kids Xtra on a device?",
        answer:
          "Kids Xtra runs as a secure web app. Open it in the browser on a phone, tablet, computer, Chromebook, or Amazon Fire device. You can also add it to the home screen where supported.",
      },
      {
        question: "Why am I not receiving notifications?",
        answer:
          "Make sure notifications are allowed in your browser and device settings. On iPhone and iPad, install Kids Xtra on the Home Screen first. Battery-saving modes can delay notifications.",
      },
      {
        question: "What information does a child account need?",
        answer:
          "Kid profiles are controlled by the parent account and do not require child email addresses. Parents should avoid using sensitive information in child names, Mission notes, or support emails.",
      },
      {
        question: "How do I manage or cancel billing?",
        answer:
          "Parents can manage billing from the Billing or Settings area. Stripe's secure billing portal lets you update payment details or cancel before the next billing period.",
      },
      {
        question: "How do I contact support?",
        answer:
          "Email Kids Xtra support from your account email when possible. Do not send passwords, child PINs, or sensitive family information.",
      },
    ],
  },
] satisfies FaqCategory[];

export const FAQS: FaqItem[] = FAQ_CATEGORIES.flatMap((category) => category.items);
