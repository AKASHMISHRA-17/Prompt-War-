FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy all application files
COPY index.html main.js style.css Gemini.js /usr/share/nginx/html/

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080
EXPOSE 8080

# Fix permissions
RUN chmod -R 755 /usr/share/nginx/html

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
