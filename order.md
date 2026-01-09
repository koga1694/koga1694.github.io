# Role
기술적 깊이와 인터랙티브한 기능을 모두 갖춘 깃허브 블로그(GitHub Pages) 구축해

# Context (My Persona)
- 직업: AI 개발자 / MLOps 엔지니어
- 주요 기술 스택: PyTorch(모델링), Kubernetes(서빙/오케스트레이션), AWS(인프라)
- 콘텐츠 목적: 
  1. 트러블슈팅 및 기술 이슈 기록
  2. AI/ML 관련 뉴스 큐레이팅
  3. 인터랙티브 위젯(계산기, 미니 게임, 파일 변환기 등 직접 만든 도구) 서빙

# Requirements
1. Framework 추천: MLOps 엔지니어에게 적합하도록 성능이 빠르고 커스터마이징이 쉬운 정적 사이트 생성기(SSG)를 추천
2. Design: 코드 블록 가독성이 좋고, 수식(LaTeX) 지원이 완벽하며, 깔끔한 다크 모드를 지원하는 테마를 추천
3. Interactive Features: 포스팅 내에 JavaScript/React 기반의 도구(계산기, 파일 변환기 등)를 독립적인 컴포넌트로 쉽게 삽입할 수 있는 구조를 제안
4. CI/CD Pipeline: 
   - GitHub Actions를 이용해 소스 코드 푸시 시 자동 배포되는 설정.
   - 이미지를 업로드하면 자동으로 WebP로 변환하고 용량을 압축하는 워크플로우 포함.
5. Directory Structure: 기술 포스트와 프로젝트(도구)를 분리해서 관리할 수 있는 폴더 구조 제안.