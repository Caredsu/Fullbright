FROM php:8.4-apache

# Force cache invalidation - timestamp changes every commit
ENV BUILD_TIMESTAMP="2026-05-19_12-30-00_UTC"

# Install dependencies
RUN apt-get update && apt-get install -y \
    libssl-dev \
    unzip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install MongoDB extension
RUN pecl install mongodb && docker-php-ext-enable mongodb

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy project files FIRST
COPY . .

# Verify directory structure
RUN echo "=== Checking directory structure ===" && \
    ls -la /var/www/html/ | head -30 && \
    echo "✓ Files copied successfully!"

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Enable Apache mod_rewrite and mod_headers
RUN a2enmod rewrite headers

# Disable default Apache config
RUN a2dissite 000-default || true

# Copy custom Apache configuration
COPY 000-default.conf /etc/apache2/sites-available/000-default.conf

# Configure Apache to listen on port 8080
RUN sed -i 's/80/8080/g' /etc/apache2/ports.conf

# Enable our custom site
RUN a2ensite 000-default

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html && \
    chmod -R 775 /var/www/html/storage

# Final verification
RUN echo "=== Final verification ===" && \
    [ -d "/var/www/html/assets" ] && echo "✓ Assets folder exists" || echo "⚠ Assets folder missing (will be built at runtime)"

# Expose port
EXPOSE 8080

# Start Apache in foreground
CMD ["apache2-foreground"]
