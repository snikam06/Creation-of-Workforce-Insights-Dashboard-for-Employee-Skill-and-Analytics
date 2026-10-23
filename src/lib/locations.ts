// Indian work locations grouped by state / union territory.
// Used by the Add Employee form so the admin can pick a real location
// instead of typing free text (an "Add new" option is still available).

export interface LocationGroup { label: string; items: string[] }

export const INDIA_LOCATIONS: LocationGroup[] = [
  { label: "Andhra Pradesh", items: ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kakinada"] },
  { label: "Assam", items: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"] },
  { label: "Bihar", items: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"] },
  { label: "Chandigarh (UT)", items: ["Chandigarh"] },
  { label: "Chhattisgarh", items: ["Raipur", "Bhilai", "Bilaspur", "Korba"] },
  { label: "Delhi NCR", items: ["New Delhi", "Delhi NCR", "Noida", "Gurugram", "Ghaziabad", "Faridabad"] },
  { label: "Goa", items: ["Panaji", "Margao", "Vasco da Gama"] },
  { label: "Gujarat", items: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar"] },
  { label: "Haryana", items: ["Gurugram", "Faridabad", "Panipat", "Karnal", "Hisar"] },
  { label: "Himachal Pradesh", items: ["Shimla", "Dharamshala", "Solan", "Mandi"] },
  { label: "Jammu & Kashmir (UT)", items: ["Srinagar", "Jammu"] },
  { label: "Jharkhand", items: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"] },
  { label: "Karnataka", items: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Davangere"] },
  { label: "Kerala", items: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam"] },
  { label: "Madhya Pradesh", items: ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"] },
  { label: "Maharashtra", items: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Navi Mumbai"] },
  { label: "Odisha", items: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"] },
  { label: "Punjab", items: ["Ludhiana", "Amritsar", "Jalandhar", "Mohali", "Patiala"] },
  { label: "Rajasthan", items: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"] },
  { label: "Tamil Nadu", items: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"] },
  { label: "Telangana", items: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"] },
  { label: "Uttar Pradesh", items: ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Meerut", "Noida"] },
  { label: "Uttarakhand", items: ["Dehradun", "Haridwar", "Roorkee", "Haldwani"] },
  { label: "West Bengal", items: ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol"] },
  { label: "Remote / Hybrid", items: ["Remote", "Hybrid", "Work From Home"] },
];

export const ALL_LOCATIONS: string[] = Array.from(
  new Set(INDIA_LOCATIONS.flatMap((g) => g.items)),
).sort();

/** Common designations grouped by department, used as dropdown options. */
export const DEPARTMENT_DESIGNATIONS: Record<string, string[]> = {
  Engineering: ["Software Engineer", "Senior Engineer", "Tech Lead", "Engineering Manager", "QA Engineer", "DevOps Engineer", "Principal Engineer", "Director of Engineering"],
  Product: ["Associate Product Manager", "Product Manager", "Senior Product Manager", "Group Product Manager", "Head of Product"],
  Design: ["UI/UX Designer", "Senior Designer", "Design Lead", "Design Manager", "Head of Design"],
  Sales: ["Sales Executive", "Senior Sales Executive", "Sales Manager", "Regional Sales Head", "VP Sales"],
  Marketing: ["Marketing Associate", "Marketing Manager", "Content Strategist", "Growth Manager", "Head of Marketing"],
  "Customer Success": ["Customer Success Associate", "Customer Success Manager", "Senior CSM", "Head of Customer Success"],
  Finance: ["Finance Analyst", "Senior Finance Analyst", "Finance Manager", "Financial Controller", "CFO"],
  "Human Resources": ["HR Associate", "HR Business Partner", "Senior HR Business Partner", "Recruiter", "HR Manager", "Head of People"],
  Operations: ["Operations Associate", "Operations Lead", "Operations Manager", "Head of Operations"],
  "Data & AI": ["Data Analyst", "Data Scientist", "Senior Data Scientist", "ML Engineer", "Lead Data Scientist", "Head of Data"],
};

export const DEFAULT_DEPARTMENTS = Object.keys(DEPARTMENT_DESIGNATIONS);

export const ALL_DESIGNATIONS: string[] = Array.from(
  new Set(Object.values(DEPARTMENT_DESIGNATIONS).flat()),
).sort();
