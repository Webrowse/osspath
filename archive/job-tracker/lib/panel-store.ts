// Client-side only. Set by CompanyRow before navigation starts,
// read by @modal/loading.tsx to populate the instant skeleton.
export const panelStore: {
  name: string
  logoUrl: string | null
  status: string | null
} = {
  name: "",
  logoUrl: null,
  status: null,
}
