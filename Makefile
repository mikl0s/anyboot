LIVE_BUILD_DIR := live-build-config
ISO_NAME := anyboot.iso
TEST_IMAGE_NAME := anyboot-test.img
TEST_IMAGE_SIZE := 16G

.PHONY: all build config clean test test-clean help

all: build

# Configure live-build using the auto/config script
config:
	@echo "Configuring live-build..."
	@cd $(LIVE_BUILD_DIR) && lb config

# Build the live ISO
# Depends on config implicitly, but lb build often re-runs parts of config
build: 
	@echo "Building AnyBoot ISO... (This may take a while)"
	@cd $(LIVE_BUILD_DIR) && lb build
	@echo "Build complete: $(LIVE_BUILD_DIR)/$(ISO_NAME)"

# Clean the live-build environment
clean:
	@echo "Cleaning live-build environment..."
	@cd $(LIVE_BUILD_DIR) && lb clean --purge
	@rm -f $(LIVE_BUILD_DIR)/$(ISO_NAME)

# Run the QEMU test script
test: $(LIVE_BUILD_DIR)/$(ISO_NAME)
	@echo "Starting QEMU test environment..."
	@./scripts/test-qemu.sh $(LIVE_BUILD_DIR)/$(ISO_NAME)

# Clean up the test image file
test-clean:
	@echo "Removing test disk image $(TEST_IMAGE_NAME)..."
	@rm -f $(TEST_IMAGE_NAME)

# Check if the ISO exists before trying to test
$(LIVE_BUILD_DIR)/$(ISO_NAME):
	@echo "ISO file $(LIVE_BUILD_DIR)/$(ISO_NAME) not found. Run 'make build' first."
	@exit 1

help:
	@echo "AnyBoot Build System"
	@echo "--------------------"
	@echo "make config      - Configure live-build (usually done automatically by build)"
	@echo "make build       - Build the AnyBoot live ISO (anyboot.iso)"
	@echo "make clean       - Clean the live-build artifacts"
	@echo "make test        - Build (if needed) and run the ISO in QEMU with a simulated USB drive"
	@echo "make test-clean  - Remove the QEMU test disk image ($(TEST_IMAGE_NAME))"
	@echo "make all         - Alias for 'make build'"
	@echo "make help        - Show this help message"
