# Smart Attendance System - Frontend (React build served by nginx)
FROM node:18-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
ARG REACT_APP_API_URL=http://localhost:8000
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
