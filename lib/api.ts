import axios from "axios";

// FastAPI 백엔드 주소 기본 설정
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : "http://192.168.1.103:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청(Request)을 보내기 직전에 가로채서 JWT 토큰을 헤더에 심어주는 로직
api.interceptors.request.use((config) => {
  // 브라우저 환경에서만 동작하도록 체크
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 1. 개별 취약점/위협(Finding) 인터페이스
export interface SbomThreat {
  threatSeq: number;
  threatId: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  componentRef: string;
  componentName: string;
  componentVersion?: string | null;
  ecosystem: string;
  message: string;
  recommendation?: string;
}

// 2. 통합 SBOM 상세 인터페이스 (Spring Boot 응답 규격)
export interface SbomDetailResponse {
  sbomId: string;
  status: string;
  format: string;
  specVersion: string;
  componentCount: number;
  licenseCount: number;
  vulnerabilityCount: number;
  riskScore: number;
  threats: SbomThreat[]; // findings 배열이 threats로 통합됨
}

// 3. 단일 API 호출 함수
export async function getSbomDetail(
  sbomId: string,
): Promise<SbomDetailResponse> {
  const response = await api.get(`/sboms/${sbomId}`);
  return response.data;
}

export async function downloadSbomCycloneDx(
  sbomId: string,
  filename?: string,
): Promise<void> {
  // 1. axios를 통해 데이터를 'blob'(Binary Large Object) 형태로 가져옵니다.
  // 이 과정에서 interceptor가 자동으로 Authorization 헤더(JWT)를 넣어줍니다.
  const response = await api.get(
    `/sbom/${sbomId}?format=cyclonedx-json&download=true`,
    {
      responseType: "blob",
    },
  );

  // 2. 받은 데이터를 브라우저가 인식할 수 있는 임시 URL로 만듭니다.
  const url = window.URL.createObjectURL(new Blob([response.data]));

  // 3. 가상의 <a> 태그를 만들어 클릭 이벤트를 발생시켜 다운로드를 실행합니다.
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename || `sbom-${sbomId}.cdx.json`);
  document.body.appendChild(link);
  link.click();

  // 4. 리소스 정리
  link.remove();
  window.URL.revokeObjectURL(url);
}

export interface LlmExplainRequest {
  vulnerability_type: string;
  cwe_id?: string | null;
  severity: string;
  file_path: string;
  line_number: number;
  code_snippet?: string | null;
  data_flow?: string | null;
  framework?: string | null;
  language?: string | null;
  include_remediation?: boolean;
}

export async function fetchAiExplanation(
  payload: LlmExplainRequest,
): Promise<any> {
  const response = await api.post("/llm/explain", payload);
  return response.data;
}

export interface LlmFixRequest {
  vulnerability_type: string;
  cwe_id?: string | null;
  code_snippet?: string | null;
  language?: string | null;
  preserve_functionality?: boolean;
}

// AI 패치 코드 가져오기 API 추가
export async function fetchAiFix(payload: LlmFixRequest): Promise<any> {
  const response = await api.post("/llm/fix", payload);
  return response.data;
}

// OpenAI 기반 취약점 진단 설명 요청
export async function fetchOpenAiExplanation(
  payload: LlmExplainRequest,
): Promise<any> {
  const response = await api.post("/ai/explain", payload);
  return response.data;
}

// OpenAI 기반 시큐어 코딩 패치 요청
export async function fetchOpenAiFix(payload: LlmFixRequest): Promise<any> {
  const response = await api.post("/ai/fix", payload);
  return response.data;
}

export async function downloadAuthenticatedFile(
  endpoint: string,
  filename: string,
): Promise<void> {
  const response = await api.post(endpoint, {
    responseType: "blob",
  });

  // 2. 받은 데이터를 브라우저가 인식할 수 있는 임시 URL로 만듭니다.
  const url = window.URL.createObjectURL(new Blob([response.data]));

  // 3. 가상의 <a> 태그를 만들어 클릭 이벤트를 발생시켜 다운로드를 실행합니다.
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename || `${filename}.json`);
  document.body.appendChild(link);
  link.click();

  // 4. 리소스 정리
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default api;
