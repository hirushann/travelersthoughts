/** Reasons readers get in touch, shared by the contact form and the admin inbox. */
export const CONTACT_TOPICS = [
  { value: "general", label: "General question" },
  { value: "partnership", label: "Brand partnership or sponsored content" },
  { value: "guest-post", label: "Guest post submission" },
  { value: "press", label: "Media or press inquiry" },
  { value: "feedback", label: "Feedback on our guides or tools" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export const topicLabel = (value: string) => CONTACT_TOPICS.find((t) => t.value === value)?.label ?? value;
