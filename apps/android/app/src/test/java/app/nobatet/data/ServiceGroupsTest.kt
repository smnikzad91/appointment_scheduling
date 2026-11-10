package app.nobatet.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Same cases as apps/web lib/serviceGroups.test.ts. */
class ServiceGroupsTest {
    private val cats = listOf(ServiceCategory("nail", "ناخن", 1), ServiceCategory("hair", "مو", 0), ServiceCategory("empty", "خالی", 2))
    private fun service(id: String, categoryId: String?) = SalonService(id, categoryId, id, durationMinutes = 30, priceToman = 100_000)

    @Test fun noCategoriesOneGroupWithoutHeading() {
        val g = groupServicesByCategory(emptyList(), listOf(service("a", null), service("b", null)))
        assertEquals(listOf(null to listOf("a", "b")), g.map { (name, s) -> name to s.map { it.id } })
    }

    @Test fun categoriesByOrderEmptyDroppedRestLast() {
        val g = groupServicesByCategory(cats, listOf(service("a", "nail"), service("b", null), service("c", "hair"), service("d", "deleted-category")))
        assertEquals(
            listOf("مو" to listOf("c"), "ناخن" to listOf("a"), "سایر خدمات" to listOf("b", "d")),
            g.map { (name, s) -> name to s.map { it.id } },
        )
    }

    @Test fun unusedCategoriesOnlyUncategorizedNoHeading() {
        assertNull(groupServicesByCategory(cats, listOf(service("a", null))).single().first)
    }
}
