<template>
  <div id="sidebarCategories">
    <div 
      v-for="superCat in categories" 
      :key="superCat.super"
      class="sb-super-group"
    >
      <!-- Super Category Button -->
      <div 
        class="sb-super-btn"
        :class="{ 
          active: isSelected(superCat),
          expanded: expandedSuper === superCat.super 
        }"
        @click="toggleSuperCategory(superCat)"
      >
        <span class="s-emoji">{{ getEmoji(superCat.super) }}</span>
        <span class="s-label">{{ superCat.super }}</span>
        <span class="s-cnt">{{ superCat.count }}</span>
        <span class="s-arr">{{ expandedSuper === superCat.super ? '▼' : '›' }}</span>
      </div>

      <!-- Sub Categories (expandable) -->
      <div 
        v-if="expandedSuper === superCat.super"
        class="sb-sub-group"
      >
        <div 
          v-for="subCat in superCat.subcategories"
          :key="`${superCat.super}-${subCat.name}`"
          class="sb-sub-btn"
          :class="{ active: isSubSelected(subCat) }"
          @click="selectSubCategory(subCat)"
        >
          <span class="sub-label">{{ subCat.name }}</span>
          <span class="sub-cnt">{{ subCat.count }}</span>
        </div>
      </div>
    </div>

    <div 
      v-if="categories.length === 0"
      style="padding: 1rem; text-align: center; color: #9a948c; font-size: 13px;"
    >
      No categories found
    </div>
  </div>
</template>

<script>
export default {
  name: 'CategoryList',
  props: {
    categories: {
      type: Array,
      default: () => []
    }
  },
  emits: ['category-selected'],
  data() {
    return {
      expandedSuper: null,
      selectedSubCat: null,
      emojiMap: {
        'Chips & Savory Snacks': '🥔',
        'Noodles & Rice': '🍜',
        'Cookies & Wafers': '🍪',
        'Candy & Jelly': '🍬',
        'Ice Cream': '🍦',
        'Beverages': '🥤',
        'Korean Snacks': '🇰🇷'
      }
    }
  },
  methods: {
    toggleSuperCategory(superCat) {
      // Toggle expansion
      if (this.expandedSuper === superCat.super) {
        this.expandedSuper = null
      } else {
        this.expandedSuper = superCat.super
      }
    },
    selectSubCategory(subCat) {
      this.selectedSubCat = subCat
      this.$emit('category-selected', subCat)
    },
    isSelected(superCat) {
      // Super category is "selected" if it's expanded or has selected sub
      return this.expandedSuper === superCat.super
    },
    isSubSelected(subCat) {
      return this.selectedSubCat?.name === subCat.name
    },
    getEmoji(categoryName) {
      return this.emojiMap[categoryName] || '📦'
    }
  }
}
</script>

<style scoped>
#sidebarCategories {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sb-super-group {
  margin-bottom: 0;
}

.sb-super-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #f5f1ed;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #2a2520;
  border-radius: 6px;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
  position: relative;
}

.sb-super-btn:hover {
  background: #ede9e4;
}

.sb-super-btn.expanded {
  background: #e8dfd7;
}

.sb-super-btn.active {
  background: #d9ccc1;
  color: #1a1510;
}

.s-emoji {
  font-size: 16px;
  flex-shrink: 0;
}

.s-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.s-cnt {
  font-size: 12px;
  color: #7a7370;
  min-width: 30px;
  text-align: right;
}

.s-arr {
  font-size: 12px;
  color: #7a7370;
  min-width: 16px;
  text-align: center;
  transition: transform 0.2s ease;
}

.sb-sub-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0;
  margin-left: 1rem;
  border-left: 2px solid #e8dfd7;
  padding-left: 0.5rem;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 500px;
  }
}

.sb-sub-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 13px;
  color: #5a5350;
  border-radius: 4px;
  transition: all 0.15s ease;
  text-align: left;
}

.sb-sub-btn:hover {
  background: #f5f1ed;
  color: #3a3330;
}

.sb-sub-btn.active {
  background: #ddd5cc;
  color: #1a1510;
  border-color: #ccc5bc;
  font-weight: 500;
}

.sub-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub-cnt {
  font-size: 12px;
  color: #7a7370;
  min-width: 25px;
  text-align: right;
}
</style>
