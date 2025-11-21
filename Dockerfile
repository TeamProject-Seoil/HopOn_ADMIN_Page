# 1단계: 빌드 (Node 20 + Vite)
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 2단계: nginx로 정적 파일 제공
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# nginx 설정 덮어쓰기
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 산출물 복사
COPY --from=build /app/dist .

EXPOSE 80
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
