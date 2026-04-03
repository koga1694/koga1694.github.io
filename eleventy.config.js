export default function (eleventyConfig) {
  // CSS 파일은 그대로 복사
  eleventyConfig.addPassthroughCopy("src/css");

  // 프로젝트 섹션을 컬렉션으로 등록
  eleventyConfig.addCollection("doyourself", (collectionApi) => {
    return collectionApi
      .getFilteredByTag("doyourself")
      .sort((a, b) => (a.data.order || 99) - (b.data.order || 99));
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
}
