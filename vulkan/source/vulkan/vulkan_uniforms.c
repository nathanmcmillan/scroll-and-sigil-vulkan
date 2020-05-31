#include "vulkan_uniforms.h"

void vulkan_uniformbuffer_initialize(vulkan_state *vk_state, uint32_t count, struct vulkan_uniformbuffer *uniformbuffer) {

    VkDeviceSize size = sizeof(struct uniform_buffer_object);

    uniformbuffer->count = count;
    uniformbuffer->vk_uniform_buffers = safe_calloc(count, sizeof(VkBuffer));
    uniformbuffer->vk_uniform_buffers_memory = safe_calloc(count, sizeof(VkDeviceMemory));

    VkBufferUsageFlagBits usage = VK_BUFFER_USAGE_UNIFORM_BUFFER_BIT;
    VkMemoryPropertyFlagBits properties = VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT;

    for (uint32_t i = 0; i < count; i++) {
        vk_create_buffer(vk_state, size, usage, properties, &uniformbuffer->vk_uniform_buffers[i], &uniformbuffer->vk_uniform_buffers_memory[i]);
    }
}

void vk_update_uniform_buffer(vulkan_state *vk_state, struct vulkan_pipeline *pipeline, uint32_t current_image, struct uniform_buffer_object ubo) {

    void *data;
    vkMapMemory(vk_state->vk_device, pipeline->uniforms->vk_uniform_buffers_memory[current_image], 0, sizeof(ubo), 0, &data);
    memcpy(data, &ubo, sizeof(ubo));
    vkUnmapMemory(vk_state->vk_device, pipeline->uniforms->vk_uniform_buffers_memory[current_image]);
}

void vk_create_descriptor_pool(vulkan_state *vk_state, struct vulkan_pipeline *pipeline) {

    uint32_t size = pipeline->swapchain_image_count;

    VkDescriptorPoolSize pool_size_uniform = {0};
    pool_size_uniform.type = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER;
    pool_size_uniform.descriptorCount = size;

    VkDescriptorPoolSize pool_size_samppler = {0};
    pool_size_samppler.type = VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER;
    pool_size_samppler.descriptorCount = size;

    VkDescriptorPoolSize pool_sizes[2] = {pool_size_uniform, pool_size_samppler};

    VkDescriptorPoolCreateInfo pool_info = {0};
    pool_info.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO;
    pool_info.poolSizeCount = 2;
    pool_info.pPoolSizes = pool_sizes;
    pool_info.maxSets = size;

    if (vkCreateDescriptorPool(vk_state->vk_device, &pool_info, NULL, &pipeline->vk_descriptor_pool) != VK_SUCCESS) {
        fprintf(stderr, "Error: Vulkan Create Descriptor Pool\n");
        exit(1);
    }
}

void vk_create_descriptor_sets(vulkan_state *vk_state, struct vulkan_pipeline *pipeline) {

    uint32_t size = pipeline->swapchain_image_count;

    VkDescriptorSetLayout *descriptor_set_layouts = safe_calloc(size, sizeof(VkDescriptorSetLayout));

    for (uint32_t i = 0; i < size; i++) {
        memcpy(&descriptor_set_layouts[i], &pipeline->vk_descriptor_set_layout, sizeof(VkDescriptorSetLayout));
    }

    VkDescriptorSetAllocateInfo alloc_info = {0};
    alloc_info.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO;
    alloc_info.descriptorPool = pipeline->vk_descriptor_pool;
    alloc_info.descriptorSetCount = size;
    alloc_info.pSetLayouts = descriptor_set_layouts;

    pipeline->vk_descriptor_sets = safe_calloc(size, sizeof(VkDescriptorSet));

    if (vkAllocateDescriptorSets(vk_state->vk_device, &alloc_info, pipeline->vk_descriptor_sets) != VK_SUCCESS) {
        fprintf(stderr, "Error: Vulkan Allocate Descriptor Sets\n");
        exit(1);
    }

    free(descriptor_set_layouts);

    for (uint32_t i = 0; i < size; i++) {

        VkDescriptorBufferInfo buffer_info = {0};
        buffer_info.buffer = pipeline->uniforms->vk_uniform_buffers[i];
        buffer_info.offset = 0;
        buffer_info.range = sizeof(struct uniform_buffer_object);

        VkWriteDescriptorSet descriptor_write_uniform = {0};
        descriptor_write_uniform.sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        descriptor_write_uniform.dstSet = pipeline->vk_descriptor_sets[i];
        descriptor_write_uniform.dstBinding = 0;
        descriptor_write_uniform.dstArrayElement = 0;
        descriptor_write_uniform.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER;
        descriptor_write_uniform.descriptorCount = 1;
        descriptor_write_uniform.pBufferInfo = &buffer_info;

        VkDescriptorImageInfo image_info = {0};
        image_info.imageLayout = VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL;
        image_info.imageView = pipeline->image.vk_texture_image_view;
        image_info.sampler = pipeline->image.vk_texture_sampler;

        VkWriteDescriptorSet descriptor_write_sampler = {0};
        descriptor_write_sampler.sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        descriptor_write_sampler.dstSet = pipeline->vk_descriptor_sets[i];
        descriptor_write_sampler.dstBinding = 1;
        descriptor_write_sampler.dstArrayElement = 0;
        descriptor_write_sampler.descriptorType = VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER;
        descriptor_write_sampler.descriptorCount = 1;
        descriptor_write_sampler.pImageInfo = &image_info;

        VkWriteDescriptorSet descriptor_writes[2] = {descriptor_write_uniform, descriptor_write_sampler};

        vkUpdateDescriptorSets(vk_state->vk_device, 2, descriptor_writes, 0, NULL);
    }
}
