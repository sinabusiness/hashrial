FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json .
RUN npm install --legacy-peer-deps
COPY src ./src
COPY public ./public
# UI-02 FIX: REACT_APP_API_URL="" means same origin — nginx routes /api/ to backend
ENV REACT_APP_API_URL=""
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
